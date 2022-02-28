// TODO: Allow user to report pokemon from bot channel
// usage: /report Pokemon: Abra Date: ?
// ephimiral reply, waits for user to post picture
// post the picture in the correct thread for the user
const { MessageEmbed } = require('discord.js');
const { error } = require('../helpers.js');

module.exports = {
  name        : 'report',
  description : 'Report a shiny you found!',
  args        : [
    {
      name: 'pokemon',
      type: 'STRING',
      description: 'Name of the Pokemon you are reporting',
      required: true,
    },
    // TODO: optional date?
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['SEND_MESSAGES'],
  execute     : async (interaction, args) => {
    const pokemon = interaction.options.get('pokemon').value;

    // Find the thread
    const thread = interaction.guild.channels.cache.find(channel => channel.type == 'GUILD_PUBLIC_THREAD' && channel.name.toLowerCase().startsWith(pokemon.toLowerCase()));
    if (!thread) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`Couldn't find a thread for this pokemon \`${pokemon}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // TODO: reply asking for picture

    // TODO: send image through to the correct channel
    // TODO: (with optional date) allow verifier to just click a tick/cross for auto verification?

    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setDescription(`Sent through your shiny report successfully:\n${thread}`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
