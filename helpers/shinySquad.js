const { error, debug } = require('./logging.js');
const { getTop, getShinyReport, getShinyReports } = require('../database.js');
const {
  leaderboard_channel_id,
  leaderboard_message_id,
  champion_role_id,
  shiny_squad_role_id,
  reporterRoles,
} = require('../config.js');

const sightingSymbols = {
  unconfirmed: '🕒',
  confirmed: '🟢',
  ok: '🔵',
  warning: '🟡',
  danger: '🔴',
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

function getSymbolFromDate(date = new Date()){
  const today = new Date();
  if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5))
    return sightingSymbols.confirmed;
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10))
    return sightingSymbols.ok;
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15))
    return sightingSymbols.warning;
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
  if (thread.name.includes(symbol)) return debug('name already up to date');

  // replace everything after the last | with the new symbol (should only replace the last symbol)
  const updatedChannelName = thread.name.replace(/[^|]+$/, ` ${symbol}`);
  debug(`Updated channel status ${thread.name} → ${symbol}`);
  const archived = thread.archived;
  if (archived) await thread.setArchived(false);
  await thread.edit({ name: updatedChannelName }).catch(error);
  if (archived) await thread.setArchived(true);
}

async function updateThreadNames(guild){
  debug('Updating thread names...');
  // If we already supplied the data, use that, otherwise get the data
  const results = await getShinyReports();
  console.log(results);
  // Update each of the channels
  for (const result of results) {
    const thread = await guild.channels.fetch(result.thread).catch(O_o=>{});
    if (!thread) continue;
    await updateThreadName(result.pokemon, thread);
  }
  debug('Updated thread names');
}

function applyShinySquadRole(guild){
  const membersWithNoRole = guild.members.cache.filter(m => m.roles.size == 1);
  membersWithNoRole.forEach((m)=>{
    setTimeout(()=>{
      m.roles.add(reporterRoles[0].id, 'User had no roles applied');
    }, 6e4 /* 1 minute */);
  });
}

async function keepThreadsActive(guild){
  // TODO: only keep our report threads active
  guild.channels.fetchActiveThreads().then(async fetched => {
    for (const [, thread] of fetched.threads) {
      // Toggle between 1 hour and max, so it doesn't auto archive (this counts as "activity")
      await thread.setAutoArchiveDuration(60);
      await thread.setAutoArchiveDuration('MAX');
    }
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
};
