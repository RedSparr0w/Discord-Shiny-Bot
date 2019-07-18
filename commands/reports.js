const { getUserReports } = require('../database.js');

module.exports = {
  name        : 'reports',
  aliases     : [],
  description : 'Get the number of reports you have made',
  args        : [],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['SEND_MESSAGES'],
  execute     : async (msg, args) => {
    const reports = await getUserReports(msg.member.id);
    return msg.reply(`You have made ${reports} reports!`);
  }
};
