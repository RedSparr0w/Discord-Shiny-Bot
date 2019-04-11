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
  ok: '☑️',
  warning: '⚠️',
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

function getLatestShinyList(guild){
  const isMatch = /^Most Recent (Sighting|Egg Hatch): (\w{3,9} \d{1,2}, \d{2,4})$/;
  const pokemonList = {};
  const channels = guild.channels.filter(c => c.type == 'text');
  let i = 0;
  return new Promise(function(resolve, reject) {
    channels.forEach(channel => {
      if (channel.type === "text"){
        channel.fetchMessages({
        	limit: 100 // Fetch last 50 messages.
        }).then((msgCollection) => { // Resolve promise
        	msgCollection.forEach((msg) => { // forEach on message collection
        		if (msg.pinned == true && isMatch.test(msg.content)){
              //console.log(channel.name.replace(/-[^-]+$/, ':') + msg.content.replace(/^.+\:/, ''))
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
            debug("Sent latest shiny list");
          }
        }).catch(e => {
          if (++i >= channels.size){
            resolve(pokemonList);
            debug("Sent latest shiny list");
          }
          switch (e.message){
            case 'Missing Access':
              break;
            default:
              error('Failed to fetch messages for this channel:\n', e);
          }
        });
      }
    });
  });
  debug("Fetching latest shiny list");
}

module.exports = {
  splitter,
  statusSymbols,
  getSymbolFromDate,
  getLatestShinyList,
}
