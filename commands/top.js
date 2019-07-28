const { getTop } = require('../database.js');

module.exports = {
  name        : 'top',
  aliases     : ['leaderboard'],
  description : 'Get a list of users with the most points,\n\t[type]: reports, verifications',
  args        : ['amount(10)?', 'type(reports)?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
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

    const output = [`__***Top ${results.length} ${types[type]}:***__`, ...results.map((res, place) => `**#${place + 1}** _\`(${res.points} ${type})\`_ ${msg.guild.members.get(res.user) || 'Inactive Member'}`)];
    if (output.join('\n').length >= 2000)
      return msg.reply(`Sorry this list is too large for discord, try a smaller amount`);

    msg.channel.send('Gathering Data...').then(m=>m.edit(output));
  }
};
