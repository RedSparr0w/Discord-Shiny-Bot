const { error, updateChannelNames } = require('../helpers.js')

module.exports = {
  name        : 'update',
  aliases     : ['rename'],
  description : 'Update each Pokémon channel to reflect their latest shiny status',
  args        : [],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'SEND_MESSAGES'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    msg.delete().catch(e=>error('Unable to delete message:\n', e));

    msg.channel.send(`Updating channel names with current shiny status...`);
    updateChannelNames(msg.guild);
    msg.channel.send(`Complete!`);
  }
}
