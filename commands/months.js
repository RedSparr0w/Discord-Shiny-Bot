// TODO: this whole file
const { MessageEmbed } = require('discord.js');
const { addAmount, setShinyReportDate, getShinyReport } = require('../database.js');
const {
  error,
  warn,
} = require('../helpers.js');
const { MINUTE } = require('../helpers.js');
const { updateThreadName, updateLeaderboard, addReport } = require('../other/shinySquad.js');

module.exports = {
  name        : 'jan',
  aliases     : [
    // Short months
    'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    // Full months
    'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  ],
  description : 'Set the latest sighting of a shiny Pokémon',
  args        : ['day', 'year?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'SEND_MESSAGES'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args, month) => {
    // Get Pokemon name
    const channel = msg.channel;
    const member = msg.author;
    const thread_ID = channel.id;

    // Check if this channel is for shiny reports
    const report = await getShinyReport(thread_ID);
    if (!report) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('This doesn\'t seem to be a shiny report channel?\nTry again soon, or contact one of the moderators.');
  
      return msg.reply({ embeds: [embed], ephemeral: true });
    }

    // Calculate the date specified
    const date = new Date(Date.parse(`${month} ${args[0]}, ${args[1] || new Date().getFullYear()}`));

    if (!date) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription('Unable to parse date, please try again..');
  
      return msg.reply({ embeds: [embed], ephemeral: true });
    }

    // Delete the users message with the command
    await msg.delete().catch(e=>error('Unable to delete message:', e));

    // Send message stating newest date
    const latest_embed = new MessageEmbed()
      .setColor('#3498db')
      .setDescription(`**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}\n**Verified by:** ${member.toString()}`);

    const bot_message = await channel.send({ content: '***__Latest report:__***', embeds: [latest_embed] });
    
    // Update the report date and channel name
    await setShinyReportDate(thread_ID, date);
    updateThreadName(channel);

    // Add 1 point to the verifier
    addAmount(member, 1, 'verifications');

    // Await "Thank You" message, then add 1 point to the reporter(s)
    const filter = m => m.author.id === member.id && m.mentions.members.size;
    // errors: ['time'] treats ending because of the time limit as an error
    channel.awaitMessages({filter, max: 1, time: 2 * MINUTE, errors: ['time'] })
      .then(async collected => {
        const m = collected.first();
        m.mentions.members.forEach(async member=>{
          // Add a point to reporter
          await addReport(member, 1);
        });

        // Update latest report message
        latest_embed.setDescription(`**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}\n**Reported by:** ${m.mentions.members.first().toString()}\n**Verified by:** ${member.toString()}`);
        await bot_message.edit({ content: '***__Latest report:__***', embeds: [latest_embed] });

        // Update the leaderboard
        updateLeaderboard(m.guild);

        // Archive the thread
        channel.setArchived(true).catch(error);
      })
      .catch(collected => {
        warn(`No thanks given by ${member.tag} after 2 minutes`);
        channel.setArchived(true).catch(error);
      });
  },
};
