const { MessageEmbed } = require('discord.js');
const { backupDB } = require('../database.js');

module.exports = {
  type        : 'message',
  name        : 'backup',
  aliases     : [],
  description : 'Backup database',
  args        : [],
  guildOnly   : true,
  cooldown    : 0.1,
  botperms    : ['ATTACH_FILES'],
  userperms   : ['MANAGE_GUILD'],
  channels    : ['prof-willow-backup'], // default restricted channels
  execute     : async (msg, args) => {
    backupDB(msg.guild);
    msg.channel.send({
      embeds: [new MessageEmbed().setColor('#2ecc71').setDescription('Backed up database!')],
    });
  },
};
