const fs = require('fs');
const Discord = require('discord.js');
const {
  prefix,
  token,
} = require('./config.json');
const {
  info,
  warn,
  error,
  updateChannelNames,
  updateLeaderboard,
  updateChampion,
  applyShinySquadRole,
  RunOnInterval,
} = require('./helpers.js');
const {
  setupDB,
  backupDB,
} = require('./database.js');

// Setup the database before we do anything else
(async()=>await setupDB())();

const client = new Discord.Client();
client.commands = new Discord.Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// For keeping track of cooldown timers
const cooldowns = new Discord.Collection();

client.once('ready', async() => {
  info(`Logged in as ${client.user.tag}!`);

  // Start our functions that run on specific intervals
  client.guilds.forEach(guild=>{
    new RunOnInterval(60 * 6e4 /* 1 Hour */, ()=>{
      updateChannelNames(guild);
      updateLeaderboard(guild);
      updateChampion(guild);
    });
    new RunOnInterval(6 * 60 * 6e4 /* 6 Hours */, ()=>{
      backupDB(guild);
      applyShinySquadRole(guild);
    });
  });
});

client.on('error', (e) => error('Error Thrown:', e))
  .on('warn', (warning) => warn(warning))
  .on('message', message => {
    // Either not a command or a bot, ignore
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/,?\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    if (command.guildOnly && message.channel.type !== 'text') {
      return message.channel.send('I can\'t execute that command inside DMs!');
    }

    if (message.channel.type === 'text' && message.channel.memberPermissions(message.member).missing(command.userperms).length) {
      return message.reply(`You do not have the required permissions to run this command.`);
    }

    if (message.channel.type === 'text' && message.channel.memberPermissions(message.guild.me).missing(command.botperms).length) {
      return message.reply(`I do not have the required permissions to run this command.`);
    }

    if (command.args.filter(arg=>!arg.endsWith('?')).length > args.length) {
      let reply = `You didn't provide enough command arguments!`;
          reply += `\nThe proper usage would be: \`${prefix}${command.name}${command.args.map(arg=>` [${arg}]`).join('')}\``;

      return message.channel.send(reply);
    }

    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
      }
    }


    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
      command.execute(message, args, commandName);
    } catch (e) {
      error('Error executing command:', e);
      message.reply('There was an error trying to execute that command!');
    }
  });

client.login(token);
