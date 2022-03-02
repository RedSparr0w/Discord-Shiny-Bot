const { MessageEmbed } = require('discord.js');
const { getRank } = require('../database');

module.exports = {
  name        : 'rank',
  aliases     : ['reports', 'verifications'],
  description : 'Get your current rank',
  args        : [],
  guildOnly   : false,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  execute     : async (interaction) => {
    const embed = new MessageEmbed()
      .setDescription(`***__Ranks for ${interaction.member.toString()}__***`)
      .setColor('#3498db');

    const reports = await getRank(interaction.user, 'reports');
    if (reports && reports.rank) embed.addField('Reports:', `**#${reports.rank}** *\`${reports.amount} reports\`*`);

    const verifications = await getRank(interaction.user, 'verifications');
    if (verifications && verifications.rank) embed.addField('Verifications:', `**#${verifications.rank}** *\`${verifications.amount} verifications\`*`);
    
    await interaction.reply({ embeds: [embed] });
  },
};
