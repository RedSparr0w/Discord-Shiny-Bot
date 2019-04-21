module.exports = {
  name        : 'members',
  aliases     : [],
  description : 'Retrieve a list of current server members',
  usage       : '',
  args        : [],
  guildOnly   : true,
  cooldown    : 60,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MANAGE_ROLES'],
  execute     : async (msg, args) => {
    let members = [];
    msg.guild.members.forEach(member => members.push(`${member.id}: ${member.nickname || member.user.username}${member.user.bot ? ' [BOT]' : ''}`));
    msg.channel.send(members, { code:'http', split: true });
  }
}
