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
  const pokemonList = [];
  const channels = guild.channels.filter(c => c.type == 'text');
  console.log("total channels:", channels.size)
  let i = 0;
  channels.forEach(channel => {
    if (channel.type === "text"){
      channel.fetchMessages({
      	limit: 100 // Fetch last 50 messages.
      }).then((msgCollection) => { // Resolve promise
      	msgCollection.forEach((msg) => { // forEach on message collection
      		if (msg.pinned == true && isMatch.test(msg.content)){
            //console.log(channel.name.replace(/-[^-]+$/, ':') + msg.content.replace(/^.+\:/, ''))
            date = new Date(Date.parse(msg.content.match(isMatch)[2]))
            pokemonList.push(channel.name.replace(/-[^-]+$/, '') + ': ' +  msg.content.match(isMatch)[2] + ' - ' + getSymbolFromDate(date));
            return;
          }
      	});
        if (++i >= channels.size)
          splitter(pokemonList.sort().join('\n'), 1980).forEach(m => {
            guild.channels.find(channel => channel.name === 'shiny-bot').send(m);
          });
      }).catch(e => {
        if (++i >= channels.size)
          console.log(splitter(pokemonList.sort().join('\n'), 1980));
        switch (e.message){
          case 'Missing Access':
            break;
          default:
            error('Failed to fetch messages for this channel:\n', e);
        }
      });
    }
  });
  log("Latest shiny list");
}

client.on('error', (err) => error(err.message));
client.on('warn', (warning) => warn(warning));

client.on('ready', () => {
  info(`Logged in as ${client.user.tag}!`);
  client.user.setStatus('online');

  // Shiny Squad Server
  guild = client.guilds.get(config.guild);

  // Start our functions that run on the hour, when the timer next reaches the closest hour
  getLatestShinyList(guild);
  setTimeout(()=>{
    getLatestShinyList(guild);
    setInterval(() => {
      getLatestShinyList(guild);
    }, 60 * 60 * 1000 /* 1 Hour */);

  }, new Date().setMinutes(60, 0, 0) - Date.now());
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
  console.log()
  if (!msg.member.roles.find(r => r.name.toLowerCase() === "moderators")) return;

  const args = msg.content.slice(config.prefix.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    msg.channel.send('```http\n!help: Show this message\n!list: Get a full list of the state of shiny pokemon```');
  }
  else if (command === 'ping') {
    msg.channel.send('pong');
  }
  else if (command === 'list') {
    getLatestShinyList();
  }
});

client.login(config.token);
