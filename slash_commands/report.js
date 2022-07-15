const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { shinyVerifierRoleID } = require('../config.js');
const { getDB } = require('../database.js');
const { error, MINUTE, SECOND } = require('../helpers.js');
const FuzzySet = require('fuzzyset');
const { extractMessageDate } = require('../other/ocr.js');

module.exports = {
  name        : 'report',
  description : 'Report a shiny you found!',
  args        : [
    {
      name: 'pokemon',
      type: 'STRING',
      description: 'Name of the Pokemon you are reporting',
      required: true,
    },
    {
      name: 'date',
      type: 'STRING',
      description: 'Date you are reporting for (YYYY-MM-DD or MM-DD)',
      required: false,
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_THREADS'],
  userperms   : ['SEND_MESSAGES'],
  channels    : [
    'submit-a-report',
    'talk-to-the-prof',
    'prof-willow-mods',
    'prof-willow-admins',
  ],
  execute     : async (interaction, args) => {
    const pokemon = interaction.options.get('pokemon').value;
    let date_string = interaction.options.get('date')?.value;
    let date, report;

    await interaction.deferReply({ ephemeral: true });

    const db = await getDB();
    const results = await db.all('SELECT * FROM shiny_reports');

    // If no results, thread probably doesn't exist
    if (!results || !results.length) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('Couldn\'t find a thread for this Pokemon.\nTry again soon, or contact one of the moderators.1');
  
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    const fuzzySearch = FuzzySet(results.map(r => r.pokemon.toLowerCase().replace(/[^\w\s]/g, '')), false, 1, 2);
    const pokemonName = fuzzySearch.get(pokemon.toLowerCase());
    if (pokemonName) {
      report = results.find(res => res.pokemon.toLowerCase().replace(/[^\w\s]/g, '') == pokemonName[0][1]);
    }

    // If we have no report, it probably doesn't exist
    if (!report) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('Couldn\'t find a thread for this Pokemon.\nTry again soon, or contact one of the moderators.2');
  
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    // Find the thread
    const thread = await interaction.guild.channels.fetch(report.thread).catch(e => {});
    if (!thread) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`Couldn't find a thread for this pokemon \`${pokemon}\``);
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    // If thread locked, we aren't accepting reports currently
    if (thread.locked) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`[**${thread.name}**](https://discord.com/channels/${interaction.guild.id}/${thread.id}) is currently locked for reports.\nIf you believe this is a mistake, please contact someone from <@&${shinyVerifierRoleID}> to get it unlocked.`);
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }

    const report_date = +report.date ? new Date(+report.date) : new Date(0);
    
    // Get our date object
    if (date_string) {
      if (/^(20\d{2}-)?(0?[1-9]|1[1-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_string)) {
        // If year not included, add it ourselves (assume this year)
        if (/^(0?[1-9]|1[1-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_string)) {
          date_string = `${new Date().getFullYear()}-${date_string}`;
        }

        // convert to date object
        date = new Date(Date.parse(date_string));

        // Check if report is newer than previous report
        if (date <= report_date) {
          const embed = new MessageEmbed()
            .setColor('#e74c3c')
            .setDescription([
              `${interaction.member.toString()}, Thank you for your report!`,
              'But we already have a report for that date or newer!',
              `Your report: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`,
              `Latest report: ${report_date.toLocaleString('en-us', { month: 'long' })} ${report_date.getDate()}, ${report_date.getFullYear()}`,
            ].join('\n'));
          return interaction.editReply({ embeds: [embed], ephemeral: true });
        }
      } else {
        // Date formatted incorrectly
        const temp_date = new Date();
        const embed = new MessageEmbed()
          .setColor('#e74c3c')
          .setDescription(`Please try again with the date formatted as YYYY-MM-DD or MM-DD\nExample: ${temp_date.getFullYear()}-${(temp_date.getMonth() + 1).toString().padStart(2, 0)}-${temp_date.getDate().toString().padStart(2, 0)}`);
        return interaction.editReply({ embeds: [embed], ephemeral: true });
      }
    }

    const embed = new MessageEmbed()
      .setColor('#3498db')
      .setDescription(`Please upload an image of your report for [**${thread.name}**](https://discord.com/channels/${interaction.guild.id}/${thread.id}) and i'll send it through!`);
    await interaction.editReply({ embeds: [embed], ephemeral: true });

    // Wait for the user to post a picture
    const filter = m => m.attachments.size && m.author.id === interaction.user.id;
    // errors: ['time'] treats ending because of the time limit as an error (2 minutes)
    interaction.channel.awaitMessages({filter, max: 1, time: 2 * MINUTE, errors: ['time'] })
      .then(async collected => {
        const m = collected.first();
        const files = [...m.attachments].map(a => a[1].proxyURL);

        // If no date, try read the date with OCR
        if (!date) {
          date = await extractMessageDate(files.map(f => f.replace('cdn.discordapp.com', 'media.discordapp.net')));

          if (+date && date <= report_date) {
            const embed = new MessageEmbed()
              .setColor('#e74c3c')
              .setDescription([
                `${m.author}, Thank you for your report!`,
                'But we already have a report for that date or newer!',
                `Your report: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`,
                `Latest report: ${report_date.toLocaleString('en-us', { month: 'long' })} ${report_date.getDate()}, ${report_date.getFullYear()}`,
              ].join('\n'));
            const reply = await m.reply({ embeds: [embed], ephemeral: true });
            setTimeout(() => reply.delete().catch(e=>error('Unable to delete message:', e)), 10 * SECOND);
            return m.delete().catch(e => {});
          }
        }

        // Send through the report
        const embeds = [
          new MessageEmbed()
            .setColor('#3498db')
            .setDescription(`**Reporter:** ${m.author.toString()}${+date ? `\n**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}` : ''}${m.content ? `\n\n${m.content}` : ''}`),
        ];
          
        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId('report-accept')
              .setLabel('accept')
              .setStyle('SUCCESS')
              .setEmoji('✨'),
            new MessageButton()
              .setCustomId('report-date')
              .setStyle('PRIMARY')
              .setEmoji('📅'),
            new MessageButton()
              .setCustomId('report-deny')
              .setLabel('deny')
              .setStyle('SECONDARY')
              .setEmoji('🚫')
          );

        thread.send({ embeds, components: [row], files }).catch(error);
        
        // Reply letting the user know it went through successfully
        const embed_reply = new MessageEmbed()
          .setColor('#2ecc71')
          .setDescription(`Thank you ${m.author.toString()}!\nI have sent through your shiny report successfully:\n[**${thread.name}**](https://discord.com/channels/${interaction.guild.id}/${thread.id})`);
        await m.reply({ embeds: [embed_reply] }).catch(error);

        // Delete the users message
        m.delete().catch(e=>error('Unable to delete message:', e));
      })
      .catch(collected => {
        // bot_reply.edit({ embeds: [embed.setDescription('Timed out...')], ephemeral: true });
      });

  },
};
