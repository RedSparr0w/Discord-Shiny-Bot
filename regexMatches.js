const { MessageEmbed } = require('discord.js');
const { addOrderedReactions, formatDateToString } = require('./helpers.js');
const { HOUR } = require('./helpers/constants.js');
const { modLog, mute } = require('./other/mod/functions.js');

module.exports = [
  // Auto react to comments if 2+ lines start with an emoji
  {
    regex: {
      test: (content) =>{
        const emoji_regex = /^((?:<:.+?:)\d+|[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;
        const lines = content.split(/\r?\n/).map(line=>line.trim());
        const answers = lines.filter(line=>emoji_regex.test(line));
        return answers.length >= 2;
      },
    },
    execute: (message, client) => {
      const emoji_regex = /^((?:<:.+?:)\d+|[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;
      const lines = message.content.split(/\r?\n/).map(line=>line.trim());
      const answers = lines.filter(line=>emoji_regex.test(line));
      const reactions = answers.map(answer=>answer.match(emoji_regex)[1]);
      addOrderedReactions(message, reactions);
    },
  },
  // Remove discord invite links
  {
    regex: /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.\w{1,3}\/invite)\/.+[a-z]/i,
    execute: (message, client) => {
      message.delete().catch(e => {});
      modLog(
        message.member.guild,
        `**Mod:** ${message.member.guild.me.toString()}
        **User:** ${message.member.toString()}
        **Action:** Deleted message
        **Reason:** _Invite link_
        **Message Content:**
        \`\`\`\n${message.content.replace(/```/g, '``')}\n\`\`\``.substring(0, 4000)
      );
    },
  },
  // Try remove some of the fake free nitro stuff
  {
    regex: /(https?:\/\/)?(www\.)?(([a-c]|[e-z])iscord|d[a-z]iscord|d([a-h]|[j-z])scord|di[a-z]scord|di([a-r]|[t-z])cord|dis[a-z]cord|dis([a-b]|[d-z])ord|disc[a-z]ord|disc([a-n]|[p-z])rd|disco[a-z]rd|disco([a-q]|[s-z])d|discor[a-z]d|discor([a-c]|[e-z])|discord[a-z])[\w-]+\.\w{1,10}\//i,
    execute: (message, client) => {
      if (message.content.test(/(https?:\/\/)?(www\.)?(discord\.\w{1,3}|discordapp\.\w{1,3})\//i)) {
        return;
      }
      mute(message.member, 2 * HOUR);
      modLog(
        message.member.guild,
        `**Mod:** ${message.member.guild.me.toString()}
        **User:** ${message.member.toString()}
        **Action:** _Deleted message, Muted_
        **Reason:** _Fake Discord link_
        **Message Content:**
        \`\`\`\n${message.content.replace(/```/g, '``')}\n\`\`\``.substring(0, 4000)
      );
      message.delete().catch(e => {});
    },
  },
  // Remove @everyone tags
  {
    regex: /@everyone/i,
    execute: (message, client) => {
      const time = 2 * HOUR;
      mute(message.member, time);
      modLog(
        message.member.guild,
        `**Mod:** ${message.member.guild.me.toString()}
        **User:** ${message.member.toString()}
        **Action:** Muted
        **Reason:** _Tagging \\@everyone_
        **Duration:** _${formatDateToString(time)}_
        **Message Link:** _[Here](${message.url})_
        **Message Content:**
        \`\`\`\n${message.content.replace(/```/g, '``')}\n\`\`\``.substring(0, 4000)
      );
      const embed = new MessageEmbed().setColor('#e74c3c').setDescription(`Do not attempt to tag \\@everyone\n\nYou will be unmuted in ${formatDateToString(time)}`);
      message.reply({ embeds: [embed] });
      message.delete().catch(e => {});
    },
  },
  // Try remove some of the fake free nitro stuff
  {
    regex: /https?:\/\/dis.*(\.gift\/|\/nitro)/i,
    execute: (message, client) => {
      const time = 2 * HOUR;
      mute(message.member, time);
      modLog(
        message.member.guild,
        `**Mod:** ${message.member.guild.me.toString()}
        **User:** ${message.member.toString()}
        **Action:** _Deleted message_
        **Reason:** _Nitro scam link_
        **Duration:** _${formatDateToString(time)}_
        **Message Link:** _[Here](${message.url})_
        **Message Content:**
        \`\`\`\n${message.content.replace(/```/g, '``')}\n\`\`\``.substring(0, 4000)
      );
      const embed = new MessageEmbed().setColor('#e74c3c').setDescription(`Possible nitro scam link..\n\nYou will be unmuted in ${formatDateToString(time)}`);
      message.reply({ embeds: [embed] });
      message.delete().catch(e => {});
    },
  },
  {
    // Figure out a better way to test for the bots own ID/Role
    regex: /(<@!?733927271726841887>|<@&751709977827082260>)/,
    execute: (message, client) => {
      if (/\b(Hello|Hi|Hey|Sup)\b/i.test(message.content)) {
        const phrases = [
          'Hello',
          'Hey',
          '👋',
        ];
        message.reply(phrases[Math.floor(Math.random() * phrases.length)]);
      } else if (/(thanks|ty|thank\s*you)/i.test(message.content)) {
        const phrases = [
          'No problem!',
          'You\'re welcome!',
          'You are welcome!',
          'Anytime!',
          '️️❤️',
          'No no, Thank you!',
        ];
        message.reply(phrases[Math.floor(Math.random() * phrases.length)]);
      } else {
        const phrases = [
          'Why have you summoned me?',
          'What do you need?',
          'Here to help..',
        ];
        message.reply(phrases[Math.floor(Math.random() * phrases.length)]);
      }
    },
  },
];
