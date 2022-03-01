const { MessageEmbed } = require('discord.js');
const { modLog } = require('../other/mod/functions.js');
const { shinyVerifierRoleID } = require('../config.js');
const { getShinyReports } = require('../database.js');

module.exports = {
  name        : 'new-verifier',
  description : 'Add someone to the verifications squad',
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
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['MUTE_MEMBERS'],
  // TODO: Restrict to mod channels
  execute     : async (interaction, args) => {
    const user = interaction.options.get('user').value;

    // TODO: add the verifications role

    // Get our data
    const results = await getShinyReports();

    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setDescription(`Adding ${user.toString()} as <@&${shinyVerifierRoleID}>`);
    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Cheack each of the threads
    for (const result of results) {
      const thread = await interaction.guild.channels.fetch(result.thread).catch(O_o=>{});

      // If thread doesn't exist or archived, we will just ignore it
      if (!thread || thread.locked) continue;

      const archived = thread.archived;

      // Toggle archived, reset if was previously archived
      if (archived) await thread.setArchived(false);
      await thread.members.add(user);
      if (archived) await thread.setArchived(true);
    }

    // Add to mod log
    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **User:** ${user.id}
      **Action:** Added as <@&${shinyVerifierRoleID}>`);
  },
};
