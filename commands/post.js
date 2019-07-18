const { error } = require('../helpers.js');

module.exports = {
  name        : 'post',
  aliases     : ['message'],
  description : 'Make or edit a post as the bot',
  args        : ['channel', 'message ID?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MANAGE_GUILD'],
  execute     : async (msg, args) => {
    msg.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
    const [, message_id] = args;

    if (!msg.mentions.channels.size){
      return msg.reply(`You didn't specify a channel..`);
    }
    const channel = msg.mentions.channels.first();
    if (channel.memberPermissions(msg.guild.me).missing(['VIEW_CHANNEL', 'SEND_MESSAGES']).length){
      return msg.reply(`I don't have permission to post in ${channel}..`);
    }

    let message = false;
    if (message_id && message_id.length >= 8) {
      try {
        message = await channel.fetchMessage(message_id);
      } catch(err) {
        return msg.reply('Specified message id not found..')
          .then(m => {
            setTimeout(()=>{
              m.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
            }, 8000);
          });
      }
    }

    const bot_reply = await msg.reply('What would you like me to post?');

    const filter = m => m.author.id === msg.author.id;
    // errors: ['time'] treats ending because of the time limit as an error (2 minutes)
    msg.channel.awaitMessages(filter, { max: 1, time: 180000, errors: ['time'] })
      .then(collected => {
        const m = collected.first();
        if (message){
          message.edit(m.content);
        } else {
          channel.send(m.content);
        }
        bot_reply.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
        m.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
      })
      .catch(collected => {
        bot_reply.edit('Timed out..');
      });
  }
};