const { error, debug } = require('../helpers.js');
const {
  getTop,
  getShinyReport,
  getShinyReports,
  addAmount,
} = require('../database.js');
const {
  reporterRoles,
  leaderboard,
  shinyStatus,
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

async function updateThreadName(pokemon, thread){
  // Get report data
  const report = await getShinyReport(pokemon);
  if (!report) return;

  // If no reports ever
  if (!+report.date) return;

  // If channel is out of rotation then DO NOT update the name
  if (thread.locked) return;

  const date = new Date(+report.date);
  const symbol = getSymbolFromDate(date);

  // If the channel name doesn't include the correct symbol, update it
  if (thread.name.includes(symbol)) return;

  // replace everything after the last | with the new symbol (should only replace the last symbol)
  const updatedChannelName = thread.name.replace(/[^|]+$/, ` ${symbol}`);

  // Check if thread was archived beforehand, re-archive if it was
  const archived = thread.archived;
  if (archived) await thread.setArchived(false).catch(error);
  debug(`Updating channel name ${thread.name} → ${symbol}`);
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
    await updateThreadName(result.pokemon, thread);
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
  // TODO: get current champion
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
  // Find leaderboard channel
  const shinyStatusChannel = await guild.channels.fetch(shinyStatus?.channelID).catch(e => {});
  if (!shinyStatusChannel) return;

  // Find leaderboard message
  const leaderboardMessages = [...await shinyStatusChannel.messages.fetch({ limit: 100 }).catch(e => {})];
  if (!leaderboardMessages) return;

  // Get our shiny reports
  const results = await getShinyReports();
  const resultsText = results
    .sort((a,b) => a.pokemon.localeCompare(b.pokemon))
    .map((res) => `<#${res.thread}>`);
  const items_per_page = 50;

  const pages = new Array(Math.ceil(resultsText.length / items_per_page)).fill('').map(page => {
    const embed = new MessageEmbed().setColor('#3498db');
    // Setup our embeds
    embed.setDescription(resultsText.splice(0, items_per_page).join('\n'));
    // Return our message object
    return { embeds: [embed] };
  });

  let i = 0;
  for(const page of pages) {
    if (leaderboardMessages[i]) {
      await leaderboardMessages[i][1].edit(page);
    } else {
      await shinyStatusChannel.send(page);
    }
    i++;
  }

  // Update the message
  // await leaderboardMessage.edit({ content: output });
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
