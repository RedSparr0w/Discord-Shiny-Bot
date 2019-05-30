function padNumber(num, len = 2, padding = '0'){
  return num.toString().padStart(len, padding);
}

function dateTime(date = new Date()){
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
}

function log(...args){
  console.log(`\x1b[1m\x1b[37m[log][${dateTime()}]\x1b[0m`, ...args)
}

function info(...args){
  console.info(`\x1b[1m\x1b[36m[info][${dateTime()}]\x1b[0m`, ...args)
}

function debug(...args){
  console.debug(`\x1b[1m\x1b[34m[debug][${dateTime()}]\x1b[0m`, ...args)
}

function warn(...args){
  console.warn(`\x1b[1m\x1b[33m[warning][${dateTime()}]\x1b[0m`, ...args)
}

function error(...args){
  console.error(`\x1b[1m\x1b[31m[error][${dateTime()}]\x1b[0m`, ...args)
}

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
  new: '🆕',
  unconfirmed: '🕒',
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
  const channels = guild.channels.filter(channel => channel.type == 'text');
  channels.forEach(channel => {
    const pokemonName = channel.name.replace(/[-\W]+$/, '');
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
  const channels = guild.channels.filter(channel => channel.type == 'text');
  let i = 0;
  return new Promise(function(resolve, reject) {
    channels.filter(channel => channel.name != channel.name.replace(/\W+$/, ''))
      .forEach(channel => {
        channel.fetchMessages({
        	limit: 100 // Fetch last 100 messages.
        }).then((messages) => {
          const name = channel.name.replace(/\W+$/, '');
          pokemonList[name] = {
            channel: '' + channel,
            channelName: channel.name,
            dateStr: '',
            symbol: statusSymbols['unconfirmed'],
          }
          debug('Fetched messages for channel:', name);
        	messages.forEach((msg) => {
        		if (msg.pinned == true && isMatch.test(msg.content)){
              const date = new Date(Date.parse(msg.content.match(isMatch)[2]))
              pokemonList[name] = {
                ...pokemonList[name],
                ...{
                  date,
                  dateStr: msg.content.match(isMatch)[2],
                  symbol: getSymbolFromDate(date),
                },
              }
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
              error('Failed to fetch messages for this channel:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`);
          }
        });
      });
  });
}

module.exports = {
  padNumber,
  dateTime,
  log,
  info,
  debug,
  warn,
  error,
  splitter,
  statusSymbols,
  getSymbolFromDate,
  updateChannelNames,
  getShinyStatusList,
}
