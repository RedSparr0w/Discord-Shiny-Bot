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
const {
  splitter,
  statusSymbols,
  getSymbolFromDate,
  getShinyStatusList,
} = require('./helpers.js');

let guild;

client.on('error', (err) => error(err.message));
client.on('warn', (warning) => warn(warning));

client.on('ready', () => {
  info(`Logged in as ${client.user.tag}!`);
  client.user.setStatus('online');

  // Shiny Squad Server
  guild = client.guilds.get(config.guild);

  // Start our functions that run on the hour, when the timer next reaches the closest hour
  /*
  getShinyStatusList(guild);
  setTimeout(()=>{
    getShinyStatusList(guild);
    setInterval(() => {
      getShinyStatusList(guild);
    }, 60 * 60 * 1000 /* 1 Hour *//*);
  }, new Date().setMinutes(60, 0, 0) - Date.now());
  */
});

client.on('message', async msg => {
  // Ignore bots
  if (msg.author.bot) return;
  // Message is not a command, ignore it
  if (!msg.content.startsWith(config.prefix)) return;
  // If message is a DM
  if (!msg.guild) return;
  // User who sent the message does not have administrative commands in this server, ignore the command
  //if (!msg.member.hasPermission('ADMINISTRATOR')) return;
  if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.member.roles.find(r => r.name.toLowerCase() === "moderators")) return;

  const args = msg.content.slice(config.prefix.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  if (msg.channel.name.toLowerCase() === 'shiny-bot'){
    if (command === 'help') {
      msg.channel.send(`Current commands:
  \`\`\`http
  !help: This list
  !ping: Pong, Check the bot is still responding
  !list [status]: Will send a complete list showing the status of every shiny Pokemon, Filtered by status
    - status (optional): confirmed, ok, warning, danger.
  \`\`\``);
    }
    else if (command === 'ping') {
      msg.channel.send('Pong');
    }
    else if (command === 'list') {
      msg.delete()
      // return only the requested pokemon by status
      const filterSymbols = args.filter(a=>a in statusSymbols).map(a=>statusSymbols[a]);
      const filters = new RegExp(filterSymbols.join('|'));
      msg.channel.send(`Fetching current Pokemon with ${filterSymbols.join(' ')} shiny status...`);

      // Gather information of pokemon statuses
      const pokemonList = await getShinyStatusList(guild);
      const output = [];
      Object.keys(pokemonList).sort().filter(p=>filters.test(pokemonList[p].symbol)).forEach(p => {
        output.push(pokemonList[p].symbol + ' ' + pokemonList[p].dateStr + ' - ' + pokemonList[p].channel);
      });
      if (output.length > 0){
        splitter(output.join('\n'), 1980).forEach(m => {
          msg.channel.send(m);
        });
      } else {
        msg.channel.send('Nothing to report!');
      }
    }
    else if (command === 'rename' || command === 'update') {

    }
  } else {
    if (command === 'list') {
      // return only warning and danger status pokemon
      const filterSymbols = ['warning', 'danger'].map(a=>statusSymbols[a]);
      const filters = new RegExp(filterSymbols.join('|'));
      msg.channel.send(`Fetching current Pokemon with ${filterSymbols.join(' ')} shiny status...`);

      // Gather information of pokemon statuses
      const pokemonList = await getShinyStatusList(guild);
      const output = [];
      Object.keys(pokemonList).sort().filter(p=>filters.test(pokemonList[p].symbol)).forEach(p => {
        output.push(pokemonList[p].symbol + ' ' + pokemonList[p].dateStr + ' - ' + pokemonList[p].channel);
      });
      if (output.length > 0){
        splitter(output.join('\n'), 1980).forEach(m => {
          msg.channel.send(m);
        });
      } else {
        msg.channel.send('Nothing to report!');
      }
    }
  }
});

client.login(config.token);
