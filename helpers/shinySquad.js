const { error, debug } = require('./logging.js');
const { getTop } = require('../database.js');
const {
  leaderboard_channel_id,
  leaderboard_message_id,
  champion_role_id,
  shiny_squad_role_id,
} = require('../config.json');

const sightingSymbols = {
  unconfirmed: '🕒',
  confirmed: '✅',
  ok: '☑',
  warning: '⚠',
  danger: '🚫',
};

const obtainMethodSymbols = {
  research: '📦',
  hatch: '🥚',
  regional: '🗺️',
  raid: '🎫',
};

const otherSymbols = {
  new: '🆕',
  outofrotation: '🔒',
};

const statusSymbols = {
  ...sightingSymbols,
  ...obtainMethodSymbols,
  ...otherSymbols,
};

function isActiveChannel(channel){
  if (channel.parent) return channel.parent.name != 'OUT OF ROTATION';
  return true;
}

function getSymbolFromDate(date){
  const today = new Date();
  if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5))
    return statusSymbols.confirmed;
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10))
    return statusSymbols.ok;
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15))
    return statusSymbols.warning;
  else
    return statusSymbols.danger;
}

async function updateChannelName(channel, pokemonData){
  // If we already supplied the data, use that, otherwise get the data
  pokemonData = pokemonData || await getShinyStatus(channel);

  // If channel is out of rotation then DO NOT update the name
  if (!isActiveChannel(channel)) return;

  // If the channel name doesn't include the correct symbol, update it
  if (pokemonData && !channel.name.includes(pokemonData.symbol)){
    // replace everything after the last dash with the new symbol (should only replace the last symbol)
    const updatedChannelName = channel.name.replace(/[^-]+$/, `${pokemonData.symbol}`);
    channel.edit({ name: updatedChannelName });
    debug(`Updated channel status ${channel.name} → ${pokemonData.symbol}`);
  }
}

async function updateChannelNames(guild, pokemonList){
  debug('Updating channel names...');
  // If we already supplied the data, use that, otherwise get the data
  pokemonList = pokemonList || await getShinyStatusList(guild);

  // Filter out any channels which do not meet our criteria
  const channels = guild.channels.filter(channel => channel.type == 'text').filter(isActiveChannel).filter(channel => channel.name != channel.name.replace(/\W+$/, ''));

  // Update each of the channels
  channels.forEach(channel => {
    const pokemonName = channel.name.replace(/\W+$/, '');
    // If the channel name doesn't include the correct symbol, update it
    if (pokemonName in pokemonList && !channel.name.includes(pokemonList[pokemonName].symbol)){
      updateChannelName(channel, pokemonList[pokemonName]);
    }
  });
  debug('Updated channel names');
}

async function getShinyStatus(channel){
  // Regex to match the string our bot sends for dates
  const isMatch = /^Most Recent (Sighting|Egg Hatch): (\w{3,9} \d{1,2}, \d{2,4})$/;

  // Try get the messages for this channel, if we can't then assume we don't have access
  const messages = await channel.fetchMessages({ limit: 100 }).catch(O_o => {});
  if (!messages) return;

  // Basic information
  const pokemonData = {
    channel,
    channelName: channel.name,
    dateStr: '',
    symbol: statusSymbols['unconfirmed'],
  };

  // Add our symbol and date data if possible
  const dateData = await new Promise(function(resolve, reject) {
    messages.forEach(msg => {
      if (msg.pinned == true && isMatch.test(msg.content)){
        const date = new Date(Date.parse(msg.content.match(isMatch)[2]));
        resolve({
          date,
          dateStr: msg.content.match(isMatch)[2],
          symbol: getSymbolFromDate(date),
        });
      }
    });
    resolve({});
  });

  // Return the merged object
  return {
    ...pokemonData,
    ...dateData,
  };

}

async function getShinyStatusList(guild){
  // Filter out any channels which do not meet our criteria
  let channels = guild.channels.filter(channel => channel.type == 'text').filter(channel => channel.name != channel.name.replace(/\W+$/, ''));

  // Get the status of each channel
  channels = await Promise.all(channels.map(getShinyStatus));

  // Add to our object
  const pokemonList = {};
  channels.forEach(pokemonData => {
    if (pokemonData) pokemonList[pokemonData.channelName.replace(/\W+$/, '')] = pokemonData;
  });
  return pokemonList;
}

async function updateLeaderboard(guild){
  // Get the leaderboard channel
  const leaderboard_channel = guild.channels.get(leaderboard_channel_id);
  if (!leaderboard_channel) return error('Leaderboard channel not found!');

  // Get the message to be edited (must already exist)
  const leaderboard_message = await leaderboard_channel.fetchMessage(leaderboard_message_id).catch(O_o => {});
  if (!leaderboard_message) return error('Leaderboard message to edit not found!');

  // Get the results
  const results = await getTop(25, 'reports');
  const output = [`__***Top ${results.length} reporters:***__`, ...results.map((res, place) => `**#${place + 1}** _\`(${res.points} reports)\`_ ${guild.members.get(res.user) || 'Inactive Member'}`)];

  // Update the message
  return leaderboard_message.edit(output);
}

async function updateChampion(guild){
  // Get the champions role
  const champion_role = guild.roles.get(champion_role_id);
  if (!champion_role) return error('Champion role not found!');

  // Get the top users
  const results = await getTop(10, 'reports');
  // Loop through until we find one that is still a member of the server
  results.some(result=>{
    // Get user from users id
    const current_champion_id = result.user;
    const current_champion = guild.members.get(current_champion_id);

    // Check user is still a member
    if (!current_champion) return;
    current_champion.addRole(champion_role_id, `User is the new number 1 reporter!`);

    // Remove the champion role from anyone who isn't the current champion
    const previous_champion = champion_role.members.filter(m => m.id != current_champion_id);
    previous_champion.forEach(m => m.removeRole(champion_role_id, `User is no longer the number 1 reporter!`));

    return true;
  });
}

function applyShinySquadRole(guild){
  const membersWithNoRole = guild.members.filter(m=>m.roles.size == 1);
  membersWithNoRole.forEach((m)=>{
    setTimeout(()=>{
      m.addRole(shiny_squad_role_id, `User had no roles applied`);
    }, 6e4 /* 1 minute */);
  });
}

module.exports = {
  sightingSymbols,
  obtainMethodSymbols,
  otherSymbols,
  statusSymbols,
  isActiveChannel,
  getSymbolFromDate,
  updateChannelName,
  updateChannelNames,
  getShinyStatus,
  getShinyStatusList,
  updateLeaderboard,
  updateChampion,
  applyShinySquadRole,
};
