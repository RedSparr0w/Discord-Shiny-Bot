const { error, warn, debug, SECOND } = require('../helpers.js');
const {
  getTop,
  getShinyReport,
  getShinyReports,
  addAmount,
} = require('../database.js');
const {
  reporterRoles,
  leaderboard,
  shinyStatusChannelID,
} = require('../config.js');
const { modLog } = require('./mod/functions.js');
const { MessageEmbed } = require('discord.js');

const sightingSymbols = {
  verified: '🟢',
  recent: '🔵',
  ok: '🟡',
  warning: '🟠',
  danger: '🔴',
};

const obtainMethodSymbols = {
  research: '📦',
  hatch: '🥚',
  raid: '🎫',
  regional: '🌏',
};

const otherSymbols = {
  new: '🆕',
  locked: '🔒',
  unlocked: '🔓',
};

const statusSymbols = {
  ...sightingSymbols,
  ...obtainMethodSymbols,
  ...otherSymbols,
};

function getSymbolFromDate(date = new Date()){
  const today = new Date();
  // If never verified
  if (date <= 0)
    return otherSymbols.new;
  // If newer than 5 days
  if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5))
    return sightingSymbols.verified;
  // If newer than 10 days
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10))
    return sightingSymbols.recent;
  // If newer than 15 days
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15))
    return sightingSymbols.ok;
  // If newer than 21 days
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 21))
    return sightingSymbols.warning;
  // If older than 21 days
  else
    return sightingSymbols.danger;
}

async function updateThreadName(thread){
  // Check we recieved a thread
  if (!thread) return;

  // Get report data
  const report = await getShinyReport(thread.id);
  if (!report) return;

  // If no reports ever
  if (!+report.date) return;

  // If channel is out of rotation then DO NOT update the name
  if (thread.locked) return;

  // If channel is out of rotation but isn't locked, re-lock it
  if (!report.unlocked && !thread.locked) {
    // replace everything after the last | with the new symbol (should only replace the last symbol)
    const updatedChannelName = thread.name.replace(/[^|]+$/, ` ${otherSymbols.locked}`);

    // Unarchive thread (if it is), update channel name, lock thread
    await thread.setArchived(false).catch(error);
    warn(`Re-locked shiny thread ${thread.name} → ${otherSymbols.locked}`);
    await thread.edit({ name: updatedChannelName }).catch(e => error('Unable to update thread name:', e));
    // Lock, then archive
    await thread.setLocked(true).catch(error);
    await thread.setArchived(true).catch(error);
    return;
  }

  const date = new Date(+report.date);
  const symbol = getSymbolFromDate(date);

  // If the channel name doesn't include the correct symbol, update it
  if (thread.name.includes(symbol)) return;

  // replace everything after the last | with the new symbol (should only replace the last symbol)
  const updatedChannelName = thread.name.replace(/[^|]+$/, ` ${symbol}`);

  // Check if thread was archived beforehand, re-archive if it was
  const archived = thread.archived;
  if (archived) await thread.setArchived(false).catch(error);
  debug(`Updating thread name ${thread.name} → ${symbol}`);
  await thread.edit({ name: updatedChannelName }).catch(e => error('Unable to update thread name:', e));
  if (archived) await thread.setArchived(true).catch(error);
}

async function updateThreadNames(guild){
  debug('Updating thread names...');
  // Get our data
  const results = await getShinyReports();

  // Update each of the channels
  for (const result of results) {
    const thread = await guild.channels.fetch(result.thread).catch(O_o=>{});

    // If thread doesn't exist, we will just ignore it
    if (!thread) continue;

    // Update the thread name
    await updateThreadName(thread);
  }
  debug('Updated thread names');
}

async function applyShinySquadRole(guild){
  // Find any members that only have the @everyone role
  const membersWithNoRole = guild.members.cache.filter(m => m.roles.cache.size == 1);
  if (!membersWithNoRole.size) return;

  debug(`Applying shiny squad role to ${membersWithNoRole.size} members`);
  for (const [, member] of membersWithNoRole) {
    // Apply the shiny squad role
    await member.roles.add(reporterRoles[0].id, 'User had no roles applied').catch(e => error('Unable to assign role:', e));
  }
}

async function keepThreadsActive(guild){
  // Get our data
  const results = await getShinyReports();

  // Cheack each of the threads
  for (const result of results) {
    const thread = await guild.channels.fetch(result.thread).catch(O_o=>{});

    // If thread doesn't exist or archived, we will just ignore it
    if (!thread || thread.archived || thread.locked) continue;

    // Toggle thread archive time (this counts as activity to reset the timer)
    await thread.setAutoArchiveDuration(60);
    if (thread.archived) await thread.setArchived(false).catch(error);
    await thread.setAutoArchiveDuration('MAX');
  }
}

async function updateChampion(guild) {
  const championRoleID = reporterRoles[reporterRoles.length - 1].id;
  // Get the top x results (incase top member has left the server)
  const results = await getTop(50, 'reports');
  const currentChampion = guild.members.cache.find(m => m.roles.cache.has(championRoleID));

  for (const result of results){
    const member = await guild.members.fetch(result.user).catch(e => {});

    // If member not in server, go to the next one
    if (!member) continue;

    // Champion already has their role, we're done here
    if (currentChampion?.id == member?.id) break;

    // Remove previous champions role, add to new champion
    currentChampion?.roles?.remove(championRoleID, 'No longer the champion').catch(e => error('Unable to remove role:', e));
    await member.roles.add(championRoleID, 'User is the new champion').catch(e => error('Unable to assign role:', e));

    // No need to process more members
    break;
  }
}

async function updateLeaderboard(guild) {
  // Find leaderboard channel
  const leaderboardChannel = await guild.channels.fetch(leaderboard?.channelID).catch(e => {});
  if (!leaderboardChannel) return;

  // Find leaderboard message
  const leaderboardMessage = await leaderboardChannel.messages.fetch(leaderboard?.messageID).catch(e => {});
  if (!leaderboardMessage) return;

  // Get top 500
  let results = await getTop(500, 'reports');
  // Only include current members
  results = results.filter(res => guild.members.cache.find(m => m.id == res.user));
  const resultsText = results.map((res, place) => `**#${place + 1}** \`${res.amount ? res.amount.toLocaleString('en-NZ') : 0} reports\` <@!${res.user}>`);
  
  // Shrink until we can fit them all in 1 message, max length is 2k, but better to leave some allowance
  let output = ['__***Top Shiny Reporters:***__', ...resultsText].join('\n');
  while (output.length >= 1900) {
    resultsText.pop();
    output = ['__***Top Shiny Reporters:***__', ...resultsText].join('\n');
  }

  // Update the message
  await leaderboardMessage.edit({ content: output });
}

async function updateShinyStatuses(guild) {
  // Find shiny status channel
  const shinyStatusChannel = await guild.channels.fetch(shinyStatusChannelID).catch(e => {});
  if (!shinyStatusChannel) return;

  // Find shiny status message
  let shinyStatusMessages = [...await shinyStatusChannel.messages.fetch({ limit: 100 }).catch(e => {})];
  if (!shinyStatusMessages) return;
  shinyStatusMessages = shinyStatusMessages.sort(([,a], [,b]) => a.createdTimestamp - b.createdTimestamp);

  // Get our shiny reports
  const results = await getShinyReports();
  const categories = {};

  // Sort and apply to categories
  results.sort((a,b) => a.pokemon.localeCompare(b.pokemon))
    .forEach((res) => {
      // Sort by first letter of pokemon name
      // const category = (res.pokemon.match(/\((\w*)\)/)?.[1] || res.pokemon[0]).toUpperCase();
      const category = res.pokemon[0].toUpperCase();
      const output = `[**${res.unlocked ? getSymbolFromDate(res.date) : otherSymbols.locked}\t${res.pokemon}${res.symbols ? `| ${res.symbols.join(' | ')}` : ''}**](https://discord.com/channels/${guild.id}/${res.thread})`;
      if (!categories[category]) categories[category] = [];
      categories[category].push(output);
    });

  // Create our output
  const output = [];
  let outputIndex = 0;
  Object.entries(categories).sort(([a], [b]) => {
    if (a.length > 1 && b.length <= 1) return -1;
    if (b.length > 1 && a.length <= 1) return 1;
    return a.localeCompare(b);
  }).forEach(([category, values]) => {
    // Add our category
    output[outputIndex] = `${output[outputIndex] || ''}\n***__${category}:__***`;
    values.forEach(value => {
      // If output too large, move on to next page
      if (output[outputIndex].length + value.length >= 3900) {
        outputIndex++;
        output[outputIndex] = value;
      } else {
        output[outputIndex] += `\n${value}`;
      }
    });
  });

  output.forEach((page, i) => {
    // Setup our embeds
    const embed = new MessageEmbed()
      .setColor('#3498db')
      .setDescription(page);

    const leaderboardMessage = shinyStatusMessages[i];
    if (leaderboardMessage) {
      // TODO: figure out a better solution to the rate limiting
      setTimeout(() => {
        leaderboardMessage[1].edit({ embeds: [embed] });
      }, i * SECOND * 5);
    } else {
      // TODO: figure out a better solution to the rate limiting
      setTimeout(() => {
        shinyStatusChannel.send({ embeds: [embed] });
      }, i * SECOND * 5);
    }
    i++;
  });
}

async function addReport(member, amount = 1) {
  if (!member?.user) return;
  const reports = await addAmount(member.user, amount, 'reports');
  reporterRoles.forEach(role => {
    if (role.amount != reports) return;

    member.roles.add(role.id, `User reached ${role.amount} reports`).catch(e => {
      modLog(member.guild,
        `**User:** ${member.toString()}
        **Action:** Bot unable to assign <@&${role.id}> role`);
      error('Unable to assign role:', e);
    });
  });
}

module.exports = {
  sightingSymbols,
  obtainMethodSymbols,
  otherSymbols,
  statusSymbols,
  getSymbolFromDate,
  updateThreadName,
  updateThreadNames,
  applyShinySquadRole,
  keepThreadsActive,
  updateChampion,
  updateLeaderboard,
  updateShinyStatuses,
  addReport,
};
