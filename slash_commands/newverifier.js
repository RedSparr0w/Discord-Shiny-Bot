const { MessageEmbed } = require('discord.js');
const { modLog } = require('../other/mod/functions.js');
const { shinyVerifierRoleID } = require('../config.js');
const { getShinyReports } = require('../database.js');
const { error } = require('../helpers.js');

module.exports = {
  name        : 'new-verifier',
  description : 'Add someone to the shiny verifications squad',
  args        : [
    {
      name: 'user',
      type: 'USER',
      description: 'The user to add',
      required: true,
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_THREADS', 'MANAGE_ROLES'],
  userperms   : ['MUTE_MEMBERS'],
  // TODO: Restrict to mod channels
  execute     : async (interaction, args) => {
    const id = interaction.options.get('user').value;

    const member = await interaction.guild.members.fetch(id).catch(e => {});
    if (!member) {
      const embed = new MessageEmbed().setColor('#e74c3c').setDescription('Invalid user ID specified.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const user = member.user;

    // Get our data
    const results = await getShinyReports();

    const embed = new MessageEmbed()
      .setColor('#2ecc71')
      .setDescription(`Adding ${user.toString()} as <@&${shinyVerifierRoleID}>`);
    interaction.reply({ embeds: [embed] });

    // Add the shiny verifications role
    member.roles.add(shinyVerifierRoleID).catch(e => error('Unable to assign role:', e));

    // Cheack each of the threads
    for (const result of results) {
      const thread = await interaction.guild.channels.fetch(result.thread).catch(O_o=>{});

      // If thread doesn't exist or archived, we will just ignore it
      if (!thread || thread.locked) continue;

      // TODO: check if user already joined this thread

      const archived = thread.archived;

      // Toggle archived, reset if was previously archived
      if (archived) await thread.setArchived(false).catch(error);
      const m = await thread.send(`${user.toString()}`).catch(e=>{});
      await m.delete().catch(e=>{});
      if (archived) await thread.setArchived(true).catch(error);
    }

    // Add to mod log
    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **User:** ${member.toString()}
      **Action:** Added as <@&${shinyVerifierRoleID}>`);
  },
};
