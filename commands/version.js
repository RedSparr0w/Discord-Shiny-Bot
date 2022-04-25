const { MessageEmbed } = require('discord.js');
const { version: botVersion } = require('./package.json');

module.exports = {
  name        : 'version',
  aliases     : ['v'],
  description : 'Check the bots currently deployed version',
  args        : [],
  guildOnly   : true,
  cooldown    : 30,
  botperms    : ['ATTACH_FILES'],
  userperms   : ['MUTE_MEMBERS'],
  channels    : [
    'prof-willow-mods',
    'prof-willow-admins',
  ],
  execute     : async (msg, args) => {
    const embed = new MessageEmbed()
      .setDescription([
        '```yaml',
        `Version: ${botVersion}`,
        '```',
      ].join('\n'))
      .setColor('#3498db');

    return msg.reply({ embeds: [embed], ephemeral: true });
  },
};
