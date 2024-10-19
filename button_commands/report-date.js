const { MessageEmbed } = require('discord.js');
const { shinyVerifierRoleID } = require('../config.js');
const { MINUTE } = require('../helpers.js');

module.exports = {
  name        : 'report-date',
  aliases     : [],
  description : 'Update a reports date',
  args        : [],
  guildOnly   : false,
  cooldown    : 1,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  execute     : async (interaction) => {
    // Get the data from the embed
    const embeds = interaction.message.embeds;
    const reporter_id = embeds[0].description.match(/<@!?(\d+)>/)[1];

    // Check if user is NOT a verifier
    if (!interaction.member.roles.cache.has(shinyVerifierRoleID) && reporter_id !== interaction.member.id) {
      return interaction.reply({ content: `You need to have the <@&${shinyVerifierRoleID}> role to do this`, ephemeral: true });
    }

    // Ask for a new date
    await interaction.reply({ content: 'Please supply a new date (YYYY-MM-DD or MM-DD):', ephemeral: true });
    const filter = m => m.author.id === interaction.member.id && /^(\d{4}-)?\d{1,2}-\d{1,2}$/.test(m.content);

    // errors: ['time'] treats ending because of the time limit as an error
    await interaction.channel.awaitMessages({filter, max: 1, time: 1 * MINUTE, errors: ['time'] })
      .then(async collected => {
        const m = collected.first();
        date_str = m.content;
        if (/^(20\d{2}-)?(0?[1-9]|1[0-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_str)) {
          // If year not included, add it ourselves (assume this year)
          if (/^(0?[1-9]|1[0-2])-(0?[1-9]|[1-2]\d|3[0-1])$/.test(date_str)) {
            date_str = `${new Date().getFullYear()}-${date_str}`;
          }
        }
        m.delete();
      })
      .catch(e=>{});

    // If no date supplied
    if (!date_str) {
      interaction.followUp({ content: `No date supplied in time, cancelling...`, ephemeral: true });
      return debug('No date supplied');
    }

    // Update the date displayed
    const date = new Date(date_str);
    embeds[0].description = embeds[0].description.includes('Date:') ?
      embeds[0].description.replace(/Date:\*\* \w+ \d+, \d+/, `Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`) :
      `${embeds[0].description}\n**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`;

    // Edit the embed
    await interaction.message.edit({ embeds });
    return interaction.followUp({ content: `Updated report date successfully!\n${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`, ephemeral: true });

    // TODO: Accept the report if the user is a verifier
    // TODO: Add accept button if the user is the reporter
  },
};
