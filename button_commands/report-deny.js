const { shinyVerifierRoleID } = require('../config.js');
const { otherSymbols } = require('../other/shinySquad.js');
const { SECOND, error } = require('../helpers.js');

module.exports = {
  name        : 'report-deny',
  aliases     : [],
  description : 'Deny a verification report',
  args        : [],
  guildOnly   : false,
  cooldown    : 1,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  execute     : async (interaction) => {
    const embeds = interaction.message.embeds;

    // Check if user is NOT a verifier
    if (!interaction.member.roles.cache.has(shinyVerifierRoleID)) {
      return interaction.reply({ content: `You need to have the <@&${shinyVerifierRoleID}> role to do this`, ephemeral: true });
    }

    // Deny the report
    embeds.forEach(e => e.setColor('#e74c3c'));
    embeds[embeds.length - 1].setFooter({ text: '🚫 report denied..' });

    // Edit the embed, then archive the thread after 10 seconds, no new reports at the moment
    await interaction.message.edit({ embeds, components: [] });
    // Only archive if channel not new
    if (!interaction.channel.name.endsWith(otherSymbols.new)) {
      setTimeout(() => interaction.channel.setArchived(true).catch(error), 10 * SECOND);
    }
    return;
  },
};
