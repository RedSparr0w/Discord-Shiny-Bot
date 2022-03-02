const { MessageEmbed } = require('discord.js');
const { backupDB } = require('../database.js');

module.exports = {
  name        : 'backup',
  aliases     : [],
  description : 'Backup the database',
  args        : [],
  guildOnly   : true,
  cooldown    : 30,
  botperms    : ['ATTACH_FILES'],
  userperms   : ['MUTE_MEMBERS'],
  channels    : ['prof-willow-backup'],
  execute     : async (msg, args) => {
    backupDB(msg.guild);
    msg.channel.send({
      embeds: [new MessageEmbed().setColor('#2ecc71').setDescription('Backed up database!')],
    });
  },
};
