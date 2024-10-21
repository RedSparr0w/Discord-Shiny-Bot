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
    const reporter_id = embeds[0].description.match(/<@!?(\d+)>/)[1];

    // Make sure this object exists
    interaction.client.votes_cast_deny[interaction.message.id] = interaction.client.votes_cast_deny[interaction.message.id] || new Set();

    // Check if user is NOT a verifier && not the reporter
    if (!interaction.member.roles.cache.has(shinyVerifierRoleID) && interaction.member.id != reporter_id) {
      // Check if the user has submitted enough reports to be at least a 'reporter', use the amount threshold to filter as to allow the name to be changed
      const memberReports = await getReports(interaction.member);
      if (memberReports < minReportsRequired) {
        return interaction.reply({ content: 'Sorry, you need to at least 5 accepted reports to begin verifying', ephemeral: true})
      }
	  
      // Check if user has already voted on this report
      if (interaction.client.votes_cast_verify[interaction.message.id].has(interaction.member.id) || interaction.client.votes_cast_deny[interaction.message.id].has(interaction.member.id)) {
        return interaction.reply({ content: 'You have already voted on this report', ephemeral: true });
      }

      // Add their vote
      interaction.client.votes_cast_deny[interaction.message.id].add(interaction.member.id);
      let votes = embeds[0].footer?.text?.match(/Denied: (\d)/)?.[1] || 0;
      votes++

      // Check if dispute status
      let approved_votes = embeds[0].footer?.text?.match(/Approved: (\d)/)?.[1] || 0;
      // Update amount of votes
      if (approved_votes) {
        embeds[0].setFooter(`Approved: ${approved_votes} | Denied: ${votes}`);
      } else { 
        embeds[0].setFooter(`Denied: ${votes}/3`);
      }
      await interaction.message.edit({ embeds });

      // If not enough votes yet return message
      if (votes < 3) {
        return interaction.reply({ content: `Thank you for your verification, this report currently has ${votes} denies`, ephemeral: true });
      }

      if (denied_votes) {
        return interaction.reply({ content: `Thank you for your verification, this report currently has ${votes + approved_votes} votes`, ephemeral: true });
      }
      
      // If enough votes, continue to accept the report
    }

    // TODO: Add points to the verifiers, unless deny is from reporter

    // Deny the report
    embeds.forEach(e => e.setColor('#e74c3c'));
    embeds[embeds.length - 1].setFooter({ text: interaction.member.id != reporter_id ? '🚫 report denied..' : '🚫 report withdrawn..'});

    // Edit the embed, then archive the thread after 10 seconds, no new reports at the moment
    await interaction.message.edit({ embeds, components: [] });
    // Only archive if channel not new
    if (!interaction.channel.name.endsWith(otherSymbols.new)) {
      setTimeout(() => interaction.channel.setArchived(true).catch(error), 10 * SECOND);
    }
    return;
  },
};
