// TODO: Allow user to report pokemon from bot channel
// usage: /report Pokemon: Abra Date: ?
// ephimiral reply, waits for user to post picture
// post the picture in the correct thread for the user
// TODO: (with optional date) allow verifier to just click a tick/cross for auto verification?
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
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
      description: 'Date you are reporting for (YYYY-MM-DD)',
      required: false,
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['SEND_MESSAGES'],
  execute     : async (interaction, args) => {
    const pokemon = interaction.options.get('pokemon').value;
    let date_string = interaction.options.get('date')?.value;
    let date;
    
    if (date_string) {
      if (/^(\d{4}-)?\d{2}-\d{2}$/.test(date_string)) {
        if (/^\d{2}-\d{2}$/.test(date_string)) {
          date_string = `${new Date().getFullYear()}-${date_string}`;
        }
        date = new Date(Date.parse(date_string));
      } else {
        const temp_date = new Date();
        const embed = new MessageEmbed()
          .setColor('#e74c3c')
          .setDescription(`Please try again with the date formatted as YYYY-MM-DD\nExample: ${temp_date.getFullYear()}-${(temp_date.getMonth() + 1).toString().padStart(2, 0)}-${temp_date.getDay().toString().padStart(2, 0)}`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // Find the thread
    const thread = interaction.guild.channels.cache.find(channel => channel.type == 'GUILD_PUBLIC_THREAD' && channel.name.toLowerCase().startsWith(pokemon.toLowerCase()));
    if (!thread) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`Couldn't find a thread for this pokemon \`${pokemon}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // TODO: post the latest report date
    // TODO: if date supplied check that it's newer than the last report
    const embed = new MessageEmbed()
      .setColor('#3498db')
      .setDescription(`Please post an image of your report for ${thread} and i'll send it through!`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Wait for the user to post a picture
    const filter = m => m.attachments.size && m.author.id === interaction.user.id;
    // errors: ['time'] treats ending because of the time limit as an error (5 minutes)
    interaction.channel.awaitMessages({filter, max: 1, time: 5 * MINUTE, errors: ['time'] })
      .then(collected => {
        const m = collected.first();

        // Send through the report
        const embed_report = new MessageEmbed()
          .setColor('#3498db')
          .setImage(m.attachments.first().url)
          .setDescription(`Reporter: ${m.author.toString()}${date ? `\nDate: ${date_string}` : ''}${m.content ? `\n\n${m.content}` : ''}`);

          
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
        m.reply({ embeds: [embed_reply], ephemeral: true });

        // Delete the users message
        m.delete().catch(e=>error('Unable to delete message:', e));
      })
      .catch(collected => {
        // bot_reply.edit({ embeds: [embed.setDescription('Timed out...')], ephemeral: true });
      });

  },
};
