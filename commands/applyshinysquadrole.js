const { applyShinySquadRole } = require('../helpers.js');

module.exports = {
  name        : 'applyshinysquadrole',
  aliases     : [],
  description : 'Apply the Shiny Squad role to any new members that don\'t have it, To be used when Dyno bot goes down.',
  args        : [],
  guildOnly   : true,
  cooldown    : 70,
  botperms    : ['MANAGE_ROLES'],
  userperms   : ['MANAGE_ROLES'],
  execute     : async (msg, args) => {
    msg.reply(`Applying Shiny Squad role to **${msg.guild.members.filter(m=>m.roles.size == 1).size}** new members in 1 minute`);
    applyShinySquadRole(msg.guild);
    return;
  }
};
