const { MessageEmbed } = require('discord.js');
const { error, debug } = require('../helpers.js');
const { getShinyReport, setShinyReportDate } = require('../database.js');
const { modLog } = require('../other/mod/functions.js');
const { otherSymbols } = require('../other/shinySquad.js');

module.exports = {
  name        : 'unlock',
  aliases     : [],
  description : 'Unlock a shiny report thread',
  args        : [],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_THREADS'],
  userperms   : ['MANAGE_THREADS'],
  execute     : async (interaction, args) => {
    const thread = interaction.channel;
    const pokemon = thread.name.substring(0, thread.name.indexOf('|') - 1);

    // Check if this channel is for shiny reports
    const report = await getShinyReport(pokemon);
    if (!report) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('This doesn\'t seem to be a shiny report channel?\nTry again soon, or contact one of the moderators.');
  
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Send message notifying thread is locked
    const embed = new MessageEmbed()
      .setColor('#e74c3c')
      .setDescription(`Thread has been unlocked ${otherSymbols.unlocked}\n**Verifier:** ${interaction.member.toString()}`);
    await interaction.reply({ embeds: [embed] });
    
    // replace everything after the last | with the new symbol (should only replace the last symbol)
    await setShinyReportDate(pokemon, new Date(0));
    const updatedChannelName = thread.name.replace(/[^|]+$/, ` ${otherSymbols.new}`);

    // Unarchive thread (if it is), update channel name, lock thread
    await thread.setLocked(false).catch(error);
    await thread.setArchived(false).catch(error);
    debug(`Unlocked shiny thread ${thread.name} → ${otherSymbols.unlocked}`);
    await thread.edit({ name: updatedChannelName }).catch(e => error('Unable to update thread name:', e));
    

    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **Thread:** ${thread}
      **Action:** Unlocked thread ${otherSymbols.unlocked}`);
  },
};
