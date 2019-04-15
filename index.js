const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const commands = require('./commands');
const {
  log,
  info,
  debug,
  warn,
  error,
} = require('./functions.js');
const {
  updateChannelNames,
} = require('./helpers.js');

client.on('error', (err) => error(err.message))
  .on('warn', (warning) => warn(warning))
  .on('ready', () => {
    info(`Logged in as ${client.user.tag}!`);
    client.user.setStatus('online');

    // Shiny Squad Server
    let guild = client.guilds.get(config.guild);

    // Start our functions that run now and on the hour every hour
    updateChannelNames(guild);
    setTimeout(()=>{
      updateChannelNames(guild);
      setInterval(() => {
        updateChannelNames(guild);
      }, 60 * 60 * 1000 /* 1 Hour */);
    }, new Date().setMinutes(60, 0, 0) - Date.now() /* Closest Hour */);
  })
  .on('message', msg => {
    // Ignore bots
    if (msg.author.bot) return;
    // Message is not a command, ignore it
    if (!msg.content.startsWith(config.prefix)) return;

    const args = msg.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command in commands)
      commands[command](msg, args, command);
  });

client.login(config.token);
