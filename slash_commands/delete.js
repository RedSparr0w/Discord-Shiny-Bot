const { MessageEmbed } = require('discord.js');
const { modLog } = require('../other/mod/functions.js');
const { error } = require('../helpers.js');
const { getShinyReport, deleteShinyReportThread } = require('../database.js');

module.exports = {
  name        : 'delete',
  description : 'Delete this shiny pokemon thread.',
  args        : [
    {
      name: 'confirm',
      type: 'STRING',
      description: 'Please write "confirm" to confirm you want to delete this thread',
      required: true,
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_THREADS'],
  userperms   : ['MANAGE_THREADS'],
  execute     : async (interaction, args) => {
    const confirm = interaction.options.get('confirm').value;

    // Ensure they confirmed
    if (confirm !== 'confirm') {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('You must type `confirm` to delete this thread');
  
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const thread = interaction.channel;
    const thread_ID = thread.id;

    // Check if this channel is for shiny reports
    const report = await getShinyReport(thread_ID);
    if (!report) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('This doesn\'t seem to be a shiny report channel?\nTry again soon, or contact one of the moderators.');
  
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Add to mod log
    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **Action:** Deleted shiny thread
      **Thread:** ${thread.name}`);

    // Delete from the database
    deleteShinyReportThread(thread_ID);
    await thread.delete().catch(e => error('Unable to delete thread:', e));
  },
};
