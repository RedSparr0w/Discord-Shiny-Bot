const { error, debug } = require('./logging.js');

const statusSymbols = {
  confirmed: '✅',
  ok: '☑',
  warning: '⚠',
  danger: '🚫',
  new: '🆕',
  unconfirmed: '🕒',
  research: '📦',
};

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

async function updateChannelNames(guild, pokemonList){
  debug('Updating channel names...');
  pokemonList = pokemonList || await getShinyStatusList(guild);
  const channels = guild.channels.filter(channel => channel.type == 'text').filter(channel => channel.name != channel.name.replace(/\W+$/, ''));
  channels.forEach(channel => {
    const pokemonName = channel.name.replace(/\W+$/, '');
    if (pokemonName in pokemonList && !channel.name.includes(pokemonList[pokemonName].symbol)){
      // replace everything after the last dash with the new symbol (should only replace the old symbol)
      const updatedChannelName = channel.name.replace(/[^-]+$/, `${pokemonList[pokemonName].symbol}`);
      debug(`Updated channel status ${channel.name}→${pokemonList[pokemonName].symbol}`);
      channel.edit({ name: updatedChannelName });
    }
  });
  debug('Updated channel names');
}

function getShinyStatusList(guild){
  debug('Fetching latest shiny list');
  const isMatch = /^Most Recent (Sighting|Egg Hatch): (\w{3,9} \d{1,2}, \d{2,4})$/;
  const pokemonList = {};
  const channels = guild.channels.filter(channel => channel.type == 'text').filter(channel => channel.name != channel.name.replace(/\W+$/, ''));
  let i = 0;
  return new Promise(function(resolve, reject) {
    channels.forEach(channel => {
        channel.fetchMessages({
          limit: 100, // Fetch last 100 messages.
        }).then((messages) => {
          const name = channel.name.replace(/\W+$/, '');
          pokemonList[name] = {
            channel: `${channel}`,
            channelName: channel.name,
            dateStr: '',
            symbol: statusSymbols['unconfirmed'],
          };
          messages.forEach((msg) => {
            if (msg.pinned == true && isMatch.test(msg.content)){
              const date = new Date(Date.parse(msg.content.match(isMatch)[2]));
              pokemonList[name] = {
                ...pokemonList[name],
                ...{
                  date,
                  dateStr: msg.content.match(isMatch)[2],
                  symbol: getSymbolFromDate(date),
                },
              };
              return;
            }
          });

          if (++i >= channels.size){
            resolve(pokemonList);
            debug('Fetched latest shiny list');
          }
        }).catch(e => {
          if (++i >= channels.size){
            resolve(pokemonList);
            debug('Fetched latest shiny list');
          }
          switch (e.message){
            case 'Missing Access':
              break;
            default:
              error(`Failed to fetch messages for this channel (${channel.name}):\n`, `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`);
          }
        });
      });
  });
}

module.exports = {
  statusSymbols,
  getSymbolFromDate,
  updateChannelNames,
  getShinyStatusList,
};
