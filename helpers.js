const {
  log,
  info,
  debug,
  warn,
  error,
} = require('./functions.js');

function splitter(str, l){
    var strs = [];
    while(str.length > l){
        var pos = str.substring(0, l).lastIndexOf('\n');
        pos = pos <= 0 ? l : pos;
        strs.push(str.substring(0, pos));
        var i = str.indexOf('\n', pos)+1;
        if(i < pos || i > pos+l)
            i = pos;
        str = str.substring(i);
    }
    strs.push(str);
    return strs;
}

const statusSymbols = {
  confirmed: '✅',
  ok: '☑',
  warning: '⚠',
  danger: '🚫',
}

function getSymbolFromDate(date){
  today = new Date();
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
  const channels = guild.channels.filter(c => c.type == 'text');
  channels.forEach(channel => {
    const pokemonName = channel.name.replace(/-[^-]+$/, '');
    if (pokemonName in pokemonList && !channel.name.includes(pokemonList[pokemonName].symbol)){
      debug('Updated channel status ' + channel.name + '→' + pokemonList[pokemonName].symbol );
      channel.edit({ name: pokemonName + '-' + pokemonList[pokemonName].symbol })
    }
  });
  debug('Updated channel names');
}

function getShinyStatusList(guild){
  debug("Fetching latest shiny list");
  const isMatch = /^Most Recent (Sighting|Egg Hatch): (\w{3,9} \d{1,2}, \d{2,4})$/;
  const pokemonList = {};
  const channels = guild.channels.filter(c => c.type == 'text');
  let i = 0;
  return new Promise(function(resolve, reject) {
    channels.forEach(channel => {
      channel.fetchMessages({
      	limit: 100 // Fetch last 100 messages.
      }).then((msgCollection) => {
      	msgCollection.forEach((msg) => {
      		if (msg.pinned == true && isMatch.test(msg.content)){
            const date = new Date(Date.parse(msg.content.match(isMatch)[2]))
            const name = channel.name.replace(/-[^-]+$/, '');
            pokemonList[name] = {
              date,
              dateStr: msg.content.match(isMatch)[2],
              symbol: getSymbolFromDate(date),
              channel: '' + channel,
              channelName: channel.name,
            }
            //channel.edit({ name: name + '-' + pokemonList[name].symbol });
            return;
          }
      	});
        if (++i >= channels.size){
          resolve(pokemonList);
          debug("Fetched latest shiny list");
        }
      }).catch(e => {
        if (++i >= channels.size){
          resolve(pokemonList);
          debug("Fetched latest shiny list");
        }
        switch (e.message){
          case 'Missing Access':
            break;
          default:
            error('Failed to fetch messages for this channel:\n', e);
        }
      });
    });
  });
}

Months = {
  'jan': 0,
  'feb': 1,
  'mar': 2,
  'apr': 3,
  'may': 4,
  'jun': 5,
  'jul': 6,
  'aug': 7,
  'sep': 8,
  'oct': 9,
  'nov': 10,
  'dec': 11,
  0: 'January',
  1: 'February',
  2: 'March',
  3: 'April',
  4: 'May',
  5: 'June',
  6: 'July',
  7: 'August',
  8: 'September',
  9: 'October',
  10: 'November',
  11: 'December',
}

module.exports = {
  splitter,
  statusSymbols,
  getSymbolFromDate,
  updateChannelNames,
  getShinyStatusList,
  Months,
}
