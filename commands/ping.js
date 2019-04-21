module.exports = {
  name        : 'ping',
  aliases     : [],
  description : 'Check that i\'m still responding',
  args        : [],
  guildOnly   : false,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MANAGE_CHANNELS', 'MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    return msg.channel.send('Pong')
  }
}
