const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token, backupChannelID, reporterRoles, shinyVerifierRoleID } = require('./config.js');
const {
  log,
  info,
  warn,
  error,
  debug,
  RunOnInterval,
  formatChannelList,
  SECOND,
  MINUTE,
  HOUR,
} = require('./helpers.js');
const {
  setupDB,
  backupDB,
  addStatistic,
  setShinyReportDate,
  addAmount,
  getShinyReport,
} = require('./database.js');
const regexMatches = require('./regexMatches.js');
const { checkScheduledItems } = require('./other/scheduled/scheduled.js');
const {
  updateThreadName,
  updateThreadNames,
  updateChampion,
  updateLeaderboard,
  applyShinySquadRole,
  addReport,
  keepThreadsActive,
  updateShinyStatuses,
  otherSymbols,
} = require('./other/shinySquad.js');
const { extractMessageDate } = require('./other/ocr.js');

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILDS,
    Discord.Intents.FLAGS.GUILD_MEMBERS,
    Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Discord.Intents.FLAGS.GUILD_PRESENCES,
    Discord.Intents.FLAGS.GUILD_MESSAGES,
    Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Discord.Intents.FLAGS.DIRECT_MESSAGES,
    Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
  ],
  rejectOnRateLimit: () => true,
});

// Gather our available commands
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Gather our available slash commands (interactions)
client.slashCommands = new Discord.Collection();
const slashCommandsFiles = fs.readdirSync('./slash_commands').filter(file => file.endsWith('.js'));
for (const file of slashCommandsFiles) {
  const command = require(`./slash_commands/${file}`);
  client.slashCommands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

const cooldownTimeLeft = (type, seconds, userID) => {
  // Apply command cooldowns
  if (!cooldowns.has(type)) {
    cooldowns.set(type, new Discord.Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(type);
  const cooldownAmount = (seconds || 3) * 1000;

  if (timestamps.has(userID)) {
    const expirationTime = timestamps.get(userID) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return timeLeft;
    }
  }

  timestamps.set(userID, now);
  setTimeout(() => timestamps.delete(userID), cooldownAmount);
  return 0;
};

client.once('ready', async() => {
  info(`Logged in as ${client.user.tag}!`);
  log(`Invite Link: https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands`);
  // Check the database is setup
  await setupDB();

  // Check for and send any reminders every minute
  new RunOnInterval(MINUTE, () => {
    checkScheduledItems(client);
  }, { timezone_offset: 0, run_now: true });

  // Update our status every hour
  new RunOnInterval(HOUR, () => {
    // Set our status
    client.user.setActivity('Shiny hunting');
    // Update guild stuff
    client.guilds.cache.forEach(async guild => {
      await updateThreadNames(guild);
      await applyShinySquadRole(guild);
      await updateChampion(guild);
      await updateLeaderboard(guild);
      await updateShinyStatuses(guild);
    });
  }, { run_now: true });

  // Backup the database every 6 hours
  new RunOnInterval(6 * HOUR, () => {
    client.guilds.cache.forEach(guild => {
      // Backup the database file
      if (+backupChannelID) backupDB(guild);
      // Keep threads active
      keepThreadsActive(guild);
    });
  }, { timezone_offset: 0 });
});

client.on('error', e => error('Client error thrown:', e))
  .on('warn', warning => warn(warning))
  .on('guildMemberAdd', async member => {
    setTimeout(()=>{
      member.roles.add(reporterRoles[0].id, 'User joined server 1 minute ago').catch(e => error('Unable to assign role:', e));
    }, 6e4 /* 1 minute */);
  })
  .on('messageCreate', async message => {
    // Either not a command or a bot, ignore
    if (message.author.bot) return;
    
    // Make sure the bot is up and running correctly
    if (!client.application || !client.application.owner) await client.application.fetch();

    // Non command messages
    if (!message.content.startsWith(prefix)) {
      // Add points for each message sent (every 30 seconds)
      const timeLeft = cooldownTimeLeft('messages', 30, message.author.id);
      if (!timeLeft) {
        addStatistic(message.author, 'messages');
      }

      // Auto replies etc
      try {
        regexMatches.forEach(match => {
          if (match.regex.test(message.content)) {
            match.execute(message, client);
          }
        });
      } catch (err) {
        error('Regex Match Error:\n', err);
      }


      // Check if it has attachments and is in a shiny thread
      if (message.attachments.size) {
        // If not a shiny thread, ignore this attachment
        const report = await getShinyReport(message.channel.id);
        if (!report || !report.pokemon) return;

        let date_string = message.content.match(/(\d{4}-)?\d{1,2}-\d{1,2}/)?.[0];
        const report_date = +report?.date ? new Date(+report.date) : new Date(0);
        
        // Get our date object
        let date;
        if (/^(20\d{2}-)?(0?[1-9]|1[1-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_string)) {
          // If year not included, add it ourselves (assume this year)
          if (/^(0?[1-9]|1[1-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_string)) {
            date_string = `${new Date().getFullYear()}-${date_string}`;
          }

          // convert to date object
          date = new Date(Date.parse(date_string));

        }

        const files = [...message.attachments].map(a => a[1].proxyURL);

        // If no date, try read the date with OCR
        if (!date) {
          date = await extractMessageDate(files.map(f => f.replace('cdn.discordapp.com', 'media.discordapp.net')));
        }

        // Check if report is newer than previous report
        if (+date && date <= report_date) {
          const embed = new Discord.MessageEmbed()
            .setColor('#e74c3c')
            .setDescription([
              `${message.author}, Thank you for your report!`,
              'But we already have a report for that date or newer!',
              `Your report: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`,
              `Latest report: ${report_date.toLocaleString('en-us', { month: 'long' })} ${report_date.getDate()}, ${report_date.getFullYear()}`,
            ].join('\n'));
          const reply = await message.reply({ embeds: [embed], ephemeral: true });
          setTimeout(() => reply.delete().catch(e=>error('Unable to delete message:', e)), 10 * SECOND);
          message.delete().catch(e => {});
          return;
        }

        // Send through the report
        const embeds = [
          new Discord.MessageEmbed()
            .setColor('#3498db')
            .setDescription(`**Reporter:** ${message.author.toString()}${+date ? `\n**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}` : ''}${message.content ? `\n\n${message.content.replace(/(\d{4}-)?\d{1,2}-\d{1,2}/, '')}` : ''}`),
        ];
          
        const row = new Discord.MessageActionRow()
          .addComponents(
            new Discord.MessageButton()
              .setCustomId('report-accept')
              .setLabel('accept')
              .setStyle('SUCCESS')
              .setEmoji('✨'),
            new Discord.MessageButton()
              .setCustomId('report-date')
              .setStyle('SUCCESS')
              .setEmoji('📅'),
            new Discord.MessageButton()
              .setCustomId('report-deny')
              .setLabel('deny')
              .setStyle('SECONDARY')
              .setEmoji('🚫')
          );

        await message.channel.send({ embeds, components: [row], files }).catch(error);
        
        // Reply letting the user know it went through successfully
        const embed_reply = new Discord.MessageEmbed()
          .setColor('#2ecc71')
          .setDescription(`Thank you ${message.author.toString()}!\nI have sent through your shiny report successfully!`);
        const reply = await message.reply({ embeds: [embed_reply], ephemeral: true }).catch(error);
        setTimeout(() => reply.delete().catch(e=>error('Unable to delete message:', e)), 10 * SECOND);

        // Delete the users message
        return message.delete().catch(e=>error('Unable to delete message:', e));
      }

      // We don't want to process anything else now
      return;
    }

    // Each argument should be split by 1 (or more) space character
    const args = message.content.slice(prefix.length).trim().split(/,?\s+/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    // Not a valid command
    if (!command) return;


    // Check if command needs to be executed inside a guild channel
    if (command.guildOnly && !['GUILD_PRIVATE_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_TEXT'].includes(message.channel.type)) {
      return message.channel.send('This command can only be executed within guild channels!');
    }

    // Check the user has the required permissions
    if (message.channel.type === 'GUILD_TEXT' && message.channel.permissionsFor(message.member).missing(command.userperms).length) {
      return message.reply({ content: 'You do not have the required permissions to run this command.', ephemeral: true });
    }

    // Check the bot has the required permissions
    if (message.channel.type === 'GUILD_TEXT' && message.channel.permissionsFor(message.guild.me).missing(command.botperms).length) {
      return message.reply({ content: 'I do not have the required permissions to run this command.', ephemeral: true });
    }

    const commandAllowedHere = (
      // User can manage the guild, and can use bot commands anywhere
      //message.channel.permissionsFor(message.member).missing(['MANAGE_GUILD']).length === 0 ||
      // Command was run in `#****-bot`
      message.channel.name?.endsWith('-bot') ||
      // Command is allowed in this channel
      (!command.channels || command.channels.includes(message.channel.name))
    );

    if (!commandAllowedHere) {
      const output = [`This is not the correct channel for \`${prefix}${command.name}\`.`];
      if (command.channels && command.channels.length !== 0) {
        output.push(`Please try again in ${formatChannelList(message.guild, command.channels)}.`);
      }
      return message.reply({ content: output.join('\n'), ephemeral: true });
    }

    // Apply command cooldowns
    const timeLeft = Math.ceil(cooldownTimeLeft(command.name, command.cooldown, message.author.id) * 10) / 10;
    if (timeLeft > 0) {
      return message.reply({ content: `Please wait ${timeLeft} more second(s) before reusing the \`${command.name}\` command.`, ephemeral: true });
    }

    // Run the command
    try {
      // Send the message object, along with the arguments
      await command.execute(message, args, commandName);
      addStatistic(message.author, `!${command.name}`);
      addStatistic(message.author, 'commands');
    } catch (err) {
      error(`Error executing command "${command.name}":\n`, err);
      message.reply({ content: 'There was an error trying to execute that command!'});
    }
  })
  .on('interactionCreate', async interaction => {
    // Buttons
    if (interaction.isButton()) {
      // Check if button tied to a report
      if (interaction.customId.startsWith('report')) {
        // Check if user is a verifier
        if (interaction.member.roles.cache.has(shinyVerifierRoleID)) {
          try {
            // Get the data from the embed
            const embeds = interaction.message.embeds;

            if (interaction.customId == 'report-deny') {
              embeds.forEach(e => e.setColor('#e74c3c'));
              embeds[embeds.length - 1].setFooter({ text: '🚫 report denied..' });

              // Edit the embed, then archive the thread after 10 seconds, no new reports at the moment
              await interaction.message.edit({ embeds, components: [] });
              // Only archive if channel not new
              if (!interaction.channel.name.endsWith(otherSymbols.new)) {
                setTimeout(() => interaction.channel.setArchived(true).catch(error), 10 * SECOND);
              }
              return;
            }

            if (interaction.customId == 'report-accept' || interaction.customId == 'report-date') {
              const reporter_id = embeds[0].description.match(/<@!?(\d+)>/)[1];
              let date_str = embeds[0].description.match(/Date:\*\* (\w+ \d+, \d+)/)?.[1];
              // Check if date supplied or get one from verifier
              if (!date_str || interaction.customId == 'report-date') {
                await interaction.reply({ content: 'Report has no date, please supply a date (YYYY-MM-DD or MM-DD):', ephemeral: true });
                
                const filter = m => m.author.id === interaction.member.id && /^(\d{4}-)?\d{1,2}-\d{1,2}$/.test(m.content);
                // errors: ['time'] treats ending because of the time limit as an error
                await interaction.channel.awaitMessages({filter, max: 1, time: 1 * MINUTE, errors: ['time'] })
                  .then(async collected => {
                    const m = collected.first();
                    date_str = m.content;
                    if (/^(20\d{2}-)?(0?[1-9]|1[1-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_str)) {
                      // If year not included, add it ourselves (assume this year)
                      if (/^(0?[1-9]|1[1-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_str)) {
                        date_str = `${new Date().getFullYear()}-${date_str}`;
                      }
                    }
                    m.delete();
                  })
                  .catch(e=>{});

                // If no date supplied
                if (!date_str) {
                  return debug('No date supplied');
                }
              }
  
              const date = new Date(date_str);

              // Update the date we last reported
              await setShinyReportDate(interaction.channel.id, date);

              // Add points to reporter & verifier
              const reporter = await interaction.guild.members.fetch(reporter_id).catch(error);
              if (reporter) addReport(reporter, 1);
              addAmount(interaction.user, 1, 'verifications');

              embeds.forEach(e => e.setColor('#2ecc71'));
              embeds[embeds.length - 1].setFooter({ text: '✨ report accepted!' });

              const latest_embed = new Discord.MessageEmbed()
                .setColor('#3498db')
                .setDescription(`**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}\n**Reported by:** ${reporter}\n**Verified by:** ${interaction.member.toString()}`);

              await interaction.replied ? interaction.followUp({ content: '***__Latest report:__***', embeds: [latest_embed] }) : interaction.reply({ content: '***__Latest report:__***', embeds: [latest_embed] });

              await updateThreadName(interaction.channel);

              // Edit the embed, then archive the thread after 10 seconds, no new reports at the moment
              await interaction.message.edit({ embeds, components: [] });
              return setTimeout(() => interaction.channel.setArchived(true).catch(error), 10 * SECOND);
            }
            
          } catch (e) {
            error(e);
            return interaction.reply({ content: 'Something went wrong, please try again soon..', ephemeral: true });
          }
        } else {
          // User not a shiny verifier
          return interaction.reply({ content: `You need to have the <@&${shinyVerifierRoleID}> role to do this`, ephemeral: true });
        }
      }
    }

    // Commands
    if (interaction.isCommand() || interaction.isContextMenu()) {

      const command = client.slashCommands.find(cmd => cmd.name === interaction.commandName);

      // Not a valid command
      if (!command) return interaction.reply({ content: 'Command not found..', ephemeral: true });

      // Check the user has the required permissions
      if (interaction.channel.type === 'GUILD_TEXT' && interaction.channel.permissionsFor(interaction.member).missing(command.userperms).length) {
        return interaction.reply({ content: 'You do not have the required permissions to run this command.', ephemeral: true });
      }

      // Check the bot has the required permissions
      if (interaction.channel.type === 'GUILD_TEXT' && interaction.channel.permissionsFor(interaction.guild.me).missing(command.botperms).length) {
        return interaction.reply({ content: 'I do not have the required permissions to run this command.', ephemeral: true });
      }

      const commandAllowedHere = (
        // User can manage the guild, and can use bot commands anywhere
        //interaction.channel.permissionsFor(interaction.member).missing(['MANAGE_GUILD']).length === 0 ||
        // Command was run in `#****-bot`
        interaction.channel.name?.endsWith('-bot') ||
        // Command is allowed in this channel
        (!command.channels || command.channels.includes(interaction.channel.name))
      );

      if (!commandAllowedHere) {
        const output = [`This is not the correct channel for \`/${command.name}\`.`];
        if (command.channels && command.channels.length !== 0) {
          output.push(`Please try again in ${formatChannelList(interaction.guild, command.channels)}.`);
        }
        return interaction.reply({ content: output.join('\n'), ephemeral: true });
      }

      // Apply command cooldowns
      const timeLeft = Math.ceil(cooldownTimeLeft(command.name, command.cooldown, interaction.user.id) * 10) / 10;
      if (timeLeft > 0) {
        return interaction.reply({ content: `Please wait ${timeLeft} more second(s) before reusing the \`${command.name}\` command.`, ephemeral: true });
      }

      // Run the command
      try {
        // Send the message object
        await command.execute(interaction).catch(e => {
          throw(e);
        });
        addStatistic(interaction.user, `!${command.name}`);
        addStatistic(interaction.user, 'commands');
      } catch (err) {
        error(`Error executing command "${command.name}":\n`, err);
        interaction.replied ? interaction.followUp({ content: 'There was an error trying to execute that command!', ephemeral: true }) : interaction.reply({ content: 'There was an error trying to execute that command!', ephemeral: true });
      }
    }
  });

client.login(token);
