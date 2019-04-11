const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const {
  log,
  info,
  debug,
  warn,
  error,
} = require('./functions.js');

let guild;


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

function getSymbolFromDate(date){
  today = new Date();
  if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5))
    return '✅';
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10))
    return '☑️';
  else if (date >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15))
    return '⚠️';
  else
    return '🚫';
}

function getLatestShinyList(guild){
  const isMatch = /^Most Recent (Sighting|Egg Hatch): (\w{3,9} \d{1,2}, \d{2,4})$/;
  const pokemonList = {};
  const channels = guild.channels.filter(c => c.type == 'text');
  let i = 0;
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
            }
            return;
          }
      	});
        if (++i >= channels.size){
          output = [];
          Object.keys(pokemonList).sort().forEach(p => {
            output.push(pokemonList[p].symbol + ' ' + pokemonList[p].dateStr + ' - ' + pokemonList[p].channel);
          })
          splitter(output.join('\n'), 1980).forEach(m => {
            guild.channels.find(channel => channel.name === 'shiny-bot').send(m);
          });
          debug("Sent latest shiny list");
        }
      }).catch(e => {
        if (++i >= channels.size){
          output = [];
          Object.keys(pokemonList).sort().forEach(p => {
            output.push(pokemonList[p].symbol + ' ' + pokemonList[p].dateStr + ' - ' + pokemonList[p].channel);
          })
          splitter(output.join('\n'), 1980).forEach(m => {
            guild.channels.find(channel => channel.name === 'shiny-bot').send(m);
          });
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
  debug("Fetching latest shiny list");
}

client.on('error', (err) => error(err.message));
client.on('warn', (warning) => warn(warning));

client.on('ready', () => {
  info(`Logged in as ${client.user.tag}!`);
  client.user.setStatus('online');

  // Shiny Squad Server
  guild = client.guilds.get(config.guild);

  // Start our functions that run on the hour, when the timer next reaches the closest hour
  /*
  getLatestShinyList(guild);
  setTimeout(()=>{
    getLatestShinyList(guild);
    setInterval(() => {
      getLatestShinyList(guild);
    }, 60 * 60 * 1000 /* 1 Hour *//*);
  }, new Date().setMinutes(60, 0, 0) - Date.now());
  */
});

client.on('message', msg => {
  // Ignore bots
  if (msg.author.bot) return;
  // Message is not a command, ignore it
  if (!msg.content.startsWith(config.prefix)) return;
  // If message is a DM
  if (!msg.guild) return;
  // User who sent the message does not have administrative commands in this server, ignore the command
  //if (!msg.member.hasPermission('ADMINISTRATOR')) return;
  if (!msg.member.roles.find(r => r.name.toLowerCase() === "moderators")) return;

  const args = msg.content.slice(config.prefix.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  if (msg.channel.name.toLowerCase() === 'shiny-bot'){
    if (command === 'help') {
      msg.channel.send(`Current commands:
  \`\`\`http
  !help: This list
  !ping: Pong, Check the bot is still responding
  !list: Will send a complete list showing the status of every shiny Pokemon
  \`\`\``);
    }
    else if (command === 'ping') {
      msg.channel.send('Pong');
    }
    else if (command === 'list') {
      msg.channel.send('Fetching latest shiny status...');
      getLatestShinyList(guild);
    }
  }
});

client.login(config.token);
