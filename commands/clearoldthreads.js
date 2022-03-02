const { error, randomString } = require('../helpers.js');
const { ownerID } = require('../config.js');
const { getDB, getShinyReports } = require('../database.js');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { MINUTE } = require('../helpers/constants.js');

module.exports = {
  name        : 'clearoldthreads',
  aliases     : [],
  description : 'Clear out any missing threads from the database',
  args        : ['code'],
  guildOnly   : true,
  cooldown    : 0.1,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MUTE_MEMBERS'],
  execute     : async (msg, args) => {
    if (!ownerID || msg.author.id !== ownerID) return;
    try {
      const threads = [];
      const results = await getShinyReports();
      for (const result of results) {
        const thread = await msg.guild.channels.fetch(result.thread).catch(O_o=>{});
    
        // If thread doesn't exist we want to delete it
        if (!thread) threads.push(result);
      }

      if (!threads.length) {
        const embed = new MessageEmbed()
          .setDescription('Nothing to clear out!')
          .setColor('#3498db');
        return await msg.reply({ embeds: [embed] });
      }

      const embed = new MessageEmbed()
        .setDescription(threads.map(res => `${res.pokemon}: <#${res.thread}>`).join('\n'))
        .setColor('#3498db');

      const customID = randomString(6);

      const buttons = new MessageActionRow();
      buttons.addComponents(
        new MessageButton()
          .setCustomId(`true-clearoldthreads-${customID}`)
          .setLabel('delete')
          .setStyle('DANGER'),
        new MessageButton()
          .setCustomId(`false-clearoldthreads-${customID}`)
          .setLabel('cancel')
          .setStyle('SECONDARY')
      );
      const bot_msg = await msg.reply({ embeds: [embed], components: [buttons] });

      
      const filter = (i) => i.customId.endsWith(`clearoldthreads-${customID}`) && i.user.id === msg.author.id;
    
      // Allow reactions for up to x ms
      const time = 2 * MINUTE;
      const role_reaction = msg.channel.createMessageComponentCollector({ filter: filter, time });

      role_reaction.on('collect', async m => {
        await m.deferUpdate();
        if (m.customId.startsWith('true')) {
          // Delete the threads
          const db = await getDB();
          await db.run(`DELETE FROM shiny_reports WHERE shiny_reports.thread IN (${threads.map(r => r.thread).join(',')})`);
          db.close();

          const embed = new MessageEmbed()
            .setDescription('Deleted from the database!')
            .setColor('#3498db');
          await m.channel.send({ embeds: [embed] });
        }
        if (m.customId.startsWith('false')) {
          const embed = new MessageEmbed()
            .setDescription('Cancelled!')
            .setColor('#3498db');
          await m.channel.send({ embeds: [embed] });
        }
        await m.editReply({ components: [] });
      });

      // Clear all the reactions once we aren't listening
      role_reaction.on('end', () => bot_msg.edit({ components: [] }).catch(O_o=>{}));

    } catch (err) {
      error('Delete threads error:', err);
      msg.channel.send(`\`ERROR REMOVING THREADS\` \`\`\`prolog\n${err}\n\`\`\``);
    }
  },
};
