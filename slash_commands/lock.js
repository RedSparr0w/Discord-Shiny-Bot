const { MessageEmbed } = require('discord.js');
const { error, debug } = require('../helpers.js');
const { getShinyReport } = require('../database.js');
const { modLog } = require('../other/mod/functions.js');
const { otherSymbols } = require('../other/shinySquad.js');

// TODO: mark as locked
module.exports = {
  name        : 'lock',
  aliases     : [],
  description : 'Lock a shiny report thread',
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
      .setDescription(`Thread now locked ${otherSymbols.locked}\n**Verifier:** ${interaction.member.toString()}`);
    await interaction.reply({ embeds: [embed] });
    
    // replace everything after the last | with the new symbol (should only replace the last symbol)
    const updatedChannelName = thread.name.replace(/[^|]+$/, ` ${otherSymbols.locked}`);

    // Unarchive thread (if it is), update channel name, lock thread
    await thread.setArchived(false).catch(error);
    debug(`Locked shiny thread ${thread.name} → ${otherSymbols.locked}`);
    await thread.edit({ name: updatedChannelName }).catch(e => error('Unable to update thread name:', e));
    // Lock, then archive
    await thread.setLocked(true).catch(error);
    await thread.setArchived(true).catch(error);
    

    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **Thread:** ${thread}
      **Action:** Locked thread ${otherSymbols.locked}`);
  },
};
