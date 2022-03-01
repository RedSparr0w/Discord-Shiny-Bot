const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { shinyVerifierRoleID } = require('../config.js');
const { getShinyReport } = require('../database.js');
const { error } = require('../helpers.js');
const { MINUTE } = require('../helpers/constants.js');

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
      // TODO: make this a requirement?, will make for much easier verifying
      required: false,
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['SEND_MESSAGES'],
  // TODO: lock to certain channels
  execute     : async (interaction, args) => {
    const pokemon = interaction.options.get('pokemon').value;
    let date_string = interaction.options.get('date')?.value;
    let date;

    const report = await getShinyReport(pokemon);
    const report_date = +report.date ? new Date(+report.date) : 0;

    if (!report.thread) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`Couldn't find a thread for this pokemon \`${pokemon}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // Get our date object
    if (date_string) {
      if (/^(\d{4}-)?\d{2}-\d{2}$/.test(date_string)) {
        // If year not included, add it ourselves (assume this year)
        if (/^\d{2}-\d{2}$/.test(date_string)) {
          date_string = `${new Date().getFullYear()}-${date_string}`;
        }

        // convert to date object
        date = new Date(Date.parse(date_string));

        // Check if report is newer than previous report
        if (date <= report_date) {
          const embed = new MessageEmbed()
            .setColor('#e74c3c')
            .setDescription(`Thank you for your report,\nBut we already have a report for that date or newer!\nLatest report: ${report_date.getFullYear()}-${(report_date.getMonth() + 1).toString().padStart(2, 0)}-${report_date.getDate().toString().padStart(2, 0)}`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } else {
        // Date formatted incorrectly
        const temp_date = new Date();
        const embed = new MessageEmbed()
          .setColor('#e74c3c')
          .setDescription(`Please try again with the date formatted as YYYY-MM-DD or MM-DD\nExample: ${temp_date.getFullYear()}-${(temp_date.getMonth() + 1).toString().padStart(2, 0)}-${temp_date.getDate().toString().padStart(2, 0)}`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // Find the thread
    const thread = await interaction.guild.channels.fetch(report.thread);
    if (!thread) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`Couldn't find a thread for this pokemon \`${pokemon}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // If thread locked, we aren't accepting reports currently
    if (thread.locked) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`${thread} is currently locked for reports.\nIf you believe this is a mistake, please contact someone from <@&${shinyVerifierRoleID}> to get it unlocked.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new MessageEmbed()
      .setColor('#3498db')
      .setDescription(`Please post an image of your report for ${thread} and i'll send it through!`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Wait for the user to post a picture
    const filter = m => m.attachments.size && m.author.id === interaction.user.id;
    // errors: ['time'] treats ending because of the time limit as an error (5 minutes)
    interaction.channel.awaitMessages({filter, max: 1, time: 5 * MINUTE, errors: ['time'] })
      .then(async collected => {
        const m = collected.first();

        // Send through the report
        const embed_report = new MessageEmbed()
          .setColor('#3498db')
          .setImage(m.attachments.first().url)
          .setDescription(`**Reporter:** ${m.author.toString()}${date ? `\n**Date:** ${date_string}` : ''}${m.content ? `\n\n${m.content}` : ''}`);

          
        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId('report-accept')
              .setLabel('accept')
              .setStyle('SUCCESS')
              .setEmoji('✨'),
            new MessageButton()
              .setCustomId('report-deny')
              .setLabel('deny')
              .setStyle('SECONDARY')
              .setEmoji('🚫')
          );

        thread.send({ embeds: [embed_report], components: [row] });
        
        // Reply letting the user know it went through successfully
        const embed_reply = new MessageEmbed()
          .setColor('#2ecc71')
          .setDescription(`Thank you ${m.author.toString()}!\nI have sent through your shiny report successfully:\n${thread}`);
        await m.reply({ embeds: [embed_reply], ephemeral: true });

        // Delete the users message
        m.delete().catch(e=>error('Unable to delete message:', e));
      })
      .catch(collected => {
        // bot_reply.edit({ embeds: [embed.setDescription('Timed out...')], ephemeral: true });
      });

  },
};
