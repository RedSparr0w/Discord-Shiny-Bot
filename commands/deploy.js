const { MessageEmbed } = require('discord.js');
const { error, info } = require('../helpers.js');

// TODO: update alias list
module.exports = {
  name        : 'deploy',
  aliases     : [],
  description : 'Deploy slash commands',
  args        : [],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : ['MANAGE_GUILD'],
  execute     : async (msg, args) => {
    // Get our client object
    const client = msg.client;
    if (!client) return msg.reply('Something went wrong, no client found..');

    // Only allow bot owner to deploy new commands
    if (msg.author.id !== client.application.owner.id) return;

    try {
      info('Deploying commands to guild!');

      // Add our slash commands
      const data = client.slashCommands.filter(c => c.type != 'MESSAGE').map(c => ({
        name: c.name,
        description: c.description,
        options: c.args,
        defaultPermission: (!c.userperms || c.userperms?.length == 0),
      }));

      // Add any context menu commands
      data.push(...client.slashCommands.filter(c => c.type).map(c => ({
        name: c.name,
        type: c.type,
        defaultPermission: (!c.userperms || c.userperms?.length == 0),
      })));

      // Update the current list of commands for this guild
      await msg.guild.commands.set(data);

      const restrictCmds = client.slashCommands.filter(c => c.userperms?.length > 0).map(c => {
        const roleIDs = msg.guild.roles.cache.filter(r => r.permissions.has(c.userperms)).map(r => r.id);
        c.roleIDs = roleIDs;
        return c;
      });

      const fullPermissions = msg.guild.commands.cache.filter(c => restrictCmds.find(cmd => cmd.name === c.name)).map(c => {
        const cmd = restrictCmds.find(cmd => cmd.name === c.name);
        return {
          id: c.id,
          permissions: cmd.roleIDs.map(r => ({
            id: r,
            type: 'ROLE',
            permission: true,
          })),
        };
      });

      // Update the permissions for these commands
      await client.guilds.cache.get(msg.guild.id.toString()).commands.permissions.set({ fullPermissions });
      const embed = new MessageEmbed()
        .setColor('#2ecc71')
        .setDescription(`Updated guild commands!\n\`\`\`yaml\nCommands: ${data.length}\nRestricted: ${fullPermissions.length}\n\`\`\``);
  
      return msg.reply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      error('Unable to deploy new commands:\n', e);
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('Unable deploy commands, please try again..');
  
      return msg.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
