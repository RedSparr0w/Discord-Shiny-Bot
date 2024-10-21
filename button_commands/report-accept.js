const { MessageEmbed } = require('discord.js');
const { shinyVerifierRoleID, reporterRoles } = require('../config.js');
const { setShinyReportDate, addAmount } = require('../database.js');
const { error, SECOND } = require('../helpers.js');
const { updateThreadName, addReport, getReports } = require('../other/shinySquad.js');

// Calculate minimum reports needed to be a reporter to be able to vote on reports
const minReportsRequired = Math.min(...reporterRoles.filter(r => r.amount > 0).map(r => r.amount));

module.exports = {
  name        : 'report-accept',
  aliases     : [],
  description : 'Accept a verification report',
  args        : [],
  guildOnly   : false,
  cooldown    : 1,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  execute     : async (interaction) => {
    // Get the data from the embed
    const embeds = interaction.message.embeds;
    const reporter_id = embeds[0].description.match(/<@!?(\d+)>/)[1];
    date_str = embeds[0].description.match(/Date:\*\* (\w+ \d+, \d+)/)?.[1];

    // If no date supplied, ask for a new date
    if (!date_str) {
      const updateReportDate = require('./report-date.js');
      return updateReportDate.execute(interaction);
    }

    const date = new Date(date_str);

    // Make sure this object exists
    interaction.client.votes_cast_verify[interaction.message.id] = interaction.client.votes_cast_verify[interaction.message.id] || new Set();
    
    // Check if user is NOT a verifier
    if (!interaction.member.roles.cache.has(shinyVerifierRoleID)) {
      // If the reporter is trying to verify their own report
      if (interaction.member.id == reporter_id) {
        return interaction.reply({ content: 'You cannot verify your own report', ephemeral: true });
      }

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
      interaction.client.votes_cast_verify[interaction.message.id].add(interaction.member.id);
      let votes = embeds[0].footer?.text?.match(/Approved: (\d)/)?.[1] || 0;
      votes++

      // Check if dispute status
      let denied_votes = embeds[0].footer?.text?.match(/Denied: (\d)/)?.[1] || 0;
      // Update amount of votes
      if (denied_votes) {
        embeds[0].setFooter(`Approved: ${votes} | Denied: ${denied_votes}`);
      } else { 
        embeds[0].setFooter(`Approved: ${votes}/3`);
      }
      await interaction.message.edit({ embeds });

      // In dispute status, return message
      if (denied_votes) {
        return interaction.reply({ content: `Thank you for your verification, this report currently has ${votes + denied_votes} votes`, ephemeral: true });
      }

      // If not enough votes yet return message
      if (votes < 3) {
        return interaction.reply({ content: `Thank you for your verification, this report currently has ${votes} verifications`, ephemeral: true });
      }
      
      // If enough votes, continue to accept the report
    }
    // Add the user again in case they are a verifier
    interaction.client.votes_cast_verify[interaction.message.id].add(interaction.member.id);

    // Update the date we last reported
    await setShinyReportDate(interaction.channel.id, date);

    // Add points to reporter & verifier
    const reporter = await interaction.guild.members.fetch(reporter_id).catch(error);
    if (reporter) addReport(reporter, 1);
    [...interaction.client.votes_cast_verify[interaction.message.id]].forEach(async id => {
      const user = await interaction.client.users.fetch(id, false).catch(O_o=>{});
      addAmount(user, 1, 'verifications');
    });

    embeds.forEach(e => e.setColor('#2ecc71'));
    embeds[embeds.length - 1].setFooter({ text: '✨ report accepted!' });

    const latest_embed = new MessageEmbed()
      .setColor('#3498db')
      .setDescription(`**Date:**\n${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}\n\n**Reported by:**\n${reporter}\n\n**Verified by:**\n${[...interaction.client.votes_cast_verify[interaction.message.id]].map(id => `<@${id}>`).join('\n')}`);

    await interaction.replied ? interaction.followUp({ content: '***__Latest report:__***', embeds: [latest_embed] }) : interaction.reply({ content: '***__Latest report:__***', embeds: [latest_embed] });

    await updateThreadName(interaction.channel);
    
    // Empty out the votes_cast for this messageID
    delete interaction.client.votes_cast_verify[interaction.message.id]

    // Edit the embed, then archive the thread after 10 seconds, no new reports at the moment
    await interaction.message.edit({ embeds, components: [] });
    return setTimeout(() => interaction.channel.setArchived(true).catch(error), 10 * SECOND);
  },
};
