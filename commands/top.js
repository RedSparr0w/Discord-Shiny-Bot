const Discord = require('discord.js');
const { getTop } = require('../database.js');

module.exports = {
  name        : 'top',
  aliases     : ['leaderboard'],
  description : 'Get a list of users with the most points,\nTypes: reports, verifications',
  args        : ['amount(10)?', 'type(reports)?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    const types = {
      'reports': 'reporters',
      'verifications': 'verifiers',
    };
    const [ amount = 10, type = 'reports' ] = args;

    if (isNaN(amount)){
      return msg.channel.send('Invalid amount specified, Must be between 1 and 40...');
    }

    if (!Object.keys(types).includes(type)){
      return msg.channel.send('Invalid leaderboard type...');
    }

    const results = await getTop(amount, type);

    const output = results.map((res, place) => `**#${place + 1}** _\`(${res.points} ${type})\`_ ${msg.guild.members.get(res.user) || 'Inactive Member'}`);
    if (output.join('\n').length >= 2048)
      return msg.reply(`Sorry this list too large for discord, try a smaller amount`);

    const embed = new Discord.RichEmbed()
      .setTitle(`__**Top ${results.length} ${types[type]}:**__`)
      .setDescription(output)
      .setColor(0x00AE86);

    msg.channel.send('Gathering Data...').then(m=>m.edit({embed}));
  }
};
