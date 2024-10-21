const { shinyVerifierRoleID, reporterRoles } = require('../config.js');
const { otherSymbols } = require('../other/shinySquad.js');
const { SECOND, error } = require('../helpers.js');
const { modLog } = require('../other/mod/functions.js');

// Calculate minimum reports needed to be a reporter to be able to vote on reports
const minReportsRequired = Math.min(...reporterRoles.filter(r => r.amount > 0).map(r => r.amount));

const votes_required = 2;

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

    // Check if user is NOT a verifier && not the reporter
    if (!interaction.member.roles.cache.has(shinyVerifierRoleID) && interaction.member.id != reporter_id) {
      // Check if the user has submitted enough reports to be at least a 'reporter', use the amount threshold to filter as to allow the name to be changed
      const memberReports = await getReports(interaction.member);
      if (memberReports < minReportsRequired) {
        return interaction.reply({ content: 'Sorry, you need to at least 5 accepted reports to begin verifying', ephemeral: true})
      }
	  
      // Check if user has already voted on this report
      if (interaction.client.votes.hasVoted(interaction.message.id, interaction.member.id)) {
        return interaction.reply({ content: 'You have already voted on this report', ephemeral: true });
      }

      // Add their vote
      interaction.client.votes.denied(interaction.message.id).add(interaction.member.id);
      let votes = +embeds[0].footer?.text?.match(/Denied: (\d)/)?.[1] || 0;
      votes++

      // Update amount of votes
      let approved_votes = +embeds[0].footer?.text?.match(/Approved: (\d)/)?.[1] || 0;
      if (approved_votes) { // Dispute status
        embeds[0].setFooter(`Approved: ${approved_votes} | Denied: ${votes}`);
      } else { 
        embeds[0].setFooter(`Denied: ${votes}/${votes_required}`);
      }
      await interaction.message.edit({ embeds });

      // In dispute status, return message
      if (approved_votes) {
        // Mod log if this is the first deny vote
        if (votes <= 1) {
          modLog(interaction.guild,
`**Dispute:** ${interaction.message.url}
${interaction.channel.name} has gone into a dispute status..

**Approved:** ${approved_votes}
${[...interaction.client.votes.verified(interaction.message.id)].map(id => `<@${id}>`).join('\n')}

**Denied:** ${votes}
${[...interaction.client.votes.denied(interaction.message.id)].map(id => `<@${id}>`).join('\n')}`);
        }
        return interaction.reply({ content: `Thank you for your verification, this report currently has ${votes + approved_votes} votes`, ephemeral: true });
      }

      // If not enough votes yet return message
      if (votes < votes_required) {
        return interaction.reply({ content: `Thank you for your verification, this report currently has ${votes} denies`, ephemeral: true });
      }
      
      // If enough votes, continue to accept the report
    }
    // Add the user again in case they are a verifier
    interaction.client.votes.denied(interaction.message.id).add(interaction.member.id);

    // Add points to verifiers (not reporter)
    if (interaction.member.id != reporter_id) {
      [...interaction.client.votes.denied(interaction.message.id)].forEach(async id => {
        const user = await interaction.client.users.fetch(id, false).catch(O_o=>{});
        addAmount(user, 1, 'verifications');
      });
    }

    // Deny the report
    embeds.forEach(e => e.setColor('#e74c3c'));
    embeds[embeds.length - 1].setFooter({ text: interaction.member.id != reporter_id ? '🚫 report denied..' : '🚫 report withdrawn..'});

    // Empty out the votes cast for this messageID
    interaction.client.votes.delete(interaction.message.id)

    // Edit the embed, then archive the thread after 10 seconds, no new reports at the moment
    await interaction.message.edit({ embeds, components: [] });
    // Only archive if channel not new
    if (!interaction.channel.name.endsWith(otherSymbols.new)) {
      setTimeout(() => interaction.channel.setArchived(true).catch(error), 10 * SECOND);
    }
    return;
  },
};
