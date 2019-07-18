const { error } = require('../helpers.js');
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
    msg.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
    const reports = await getUserReports(msg.member.id);
    return msg.reply(`You have made ${reports} reports!`).then(m=>{
      setTimeout(()=>{
        m.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
      }, 10000);
    });
  }
};
