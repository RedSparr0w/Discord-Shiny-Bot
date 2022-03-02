/*
Command used to generate the list of aliases:
!eval
```js
const commands = msg.client.commands.map(c => [c.name, ...(c.aliases || [])]).flat();
return `'${msg.client.slashCommands.map(c => [c.name, ...(c.aliases || [])]).flat().filter(c => !commands.includes(c)).join("','")}'`;
```
*/

const { MessageEmbed } = require('discord.js');
const { prefix } = require('../config');

// TODO: update alias list
module.exports = {
  name        : 'slashcommandinfo',
  aliases     : ['commands','newshiny','lock','unlock','top','report','top','leaderboard','lb'],
  description : 'Slash command info',
  args        : [],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : ['SEND_MESSAGES'],
  execute     : async (msg, args) => {
    const commandName = msg.content.slice(prefix.length).trim().split(/,?\s+/).shift()?.toLowerCase();
    const command = msg.client.slashCommands.find(c => c.name == commandName || c.aliases?.includes(commandName));

    const embed = new MessageEmbed()
      .setDescription(`It looks like you are trying to use a command,
This command has likely moved to a slash command.
Try using \`/${command ? command.name : 'help'}\` instead`)
      .setColor('RANDOM');

    return msg.reply({ embeds: [embed] });
  },
};
