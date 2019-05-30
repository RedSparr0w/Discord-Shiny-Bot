const { error, updateChannelNames } = require('../helpers.js')

module.exports = {
  name        : 'jan',
  aliases     : ['feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  description : 'Set the latest sighting of a shiny Pokémon',
  args        : ['day', 'year?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'SEND_MESSAGES'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args, month) => {
    msg.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));

    const date = new Date(Date.parse(`${month} ${args[0]}, ${args[1] || new Date().getFullYear()}`));
    msg.channel.fetchMessages({
        limit: 100 // Fetch last 100 messages.
      }).then((messages) => {
        messages.forEach((m) => {
          if (m.pinned){
            m.unpin().catch(e=>error('Unable to unpin message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
          }
        });
      });
    msg.channel.send(`Most Recent Sighting: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`).then(m=>{
      m.pin().then(m=>{
        updateChannelNames(msg.guild);
      }).catch(e=>error('Unable to pin message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
    });
  }
}
