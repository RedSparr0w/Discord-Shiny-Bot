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
  updateChannelNames,
  getShinyStatusList,
  Months,
} = require('./helpers.js');

let guild;

client.on('error', (err) => error(err.message));
client.on('warn', (warning) => warn(warning));

client.on('ready', () => {
  info(`Logged in as ${client.user.tag}!`);
  client.user.setStatus('online');

  // Shiny Squad Server
  guild = client.guilds.get(config.guild);

  // Start our functions that run now and on the hour every hour
  updateChannelNames(guild);
  setTimeout(()=>{
    updateChannelNames(guild);
    setInterval(() => {
      updateChannelNames(guild);
    }, 60 * 60 * 1000 /* 1 Hour */);
  }, new Date().setMinutes(60, 0, 0) - Date.now() /* Closest Hour */);
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
  const isModerator = msg.member.hasPermission('ADMINISTRATOR') || !!msg.member.roles.find(r => r.name.toLowerCase() === "moderators");

  const args = msg.content.slice(config.prefix.length).trim().split(' ');
  const command = args.shift().toLowerCase();

  if (isModerator && msg.channel.name.toLowerCase() === 'shiny-bot'){
    if (command === 'help') {
      msg.channel.send(`Current commands:
  \`\`\`http
  !help: This list
  !ping: Pong, Check the bot is still responding
  !list [status]: Will send a complete list showing the status of every shiny Pokemon, Filtered by status
    - status (optional): confirmed, ok, warning, danger.
  !update: Update the channel names to reflect their current shiny status.
  !rename: (alias) !update
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
    else if (command === 'update' || command === 'rename') {
      msg.channel.send(`Updating channel names with current shiny status...`);
      updateChannelNames(guild);
      msg.channel.send(`Complete!`);
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
    else if (isModerator && command in Months) {
      msg.delete().then().catch(e=>error('Error deleting message:\n', e));
      if (!args)
        return msg.channel.send(`Must specify date - apr 10 2019?`);
      let month = command;
      const date = new Date(Date.parse(`${month} ${args[0]}, ${args[1] || new Date().getFullYear()}`));
      msg.channel.fetchMessages({
      	limit: 100 // Fetch last 100 messages.
      }).then((msgCollection) => {
      	msgCollection.forEach((m) => {
          if (m.pinned == true){
            m.unpin();
          }
        });
      });
      msg.channel.send(`Most Recent Sighting: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`).then(m=>m.pin());
    }
  }
});

client.login(config.token);
