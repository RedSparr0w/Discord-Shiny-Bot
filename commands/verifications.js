const { error } = require('../helpers.js');
const { getUserVerifications } = require('../database.js');

module.exports = {
  name        : 'verifications',
  aliases     : [],
  description : 'Get the number of verifications you have made',
  args        : [],
  guildOnly   : false,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    if (msg.channel.type !== 'dm') msg.delete().catch(e=>error('Unable to delete message:', e));
    const reports = await getUserVerifications(msg.author.id);
    return msg.reply(`You have made ${reports.toLocaleString('en-NZ')} verifications!`).then(m=>{
      setTimeout(()=>{
        if (msg.channel.type !== 'dm') m.delete().catch(e=>error('Unable to delete message:', e));
      }, 10000);
    });
  }
};
