const { MessageEmbed } = require('discord.js');
const { modLog } = require('../other/mod/functions.js');
const {
  obtainMethodSymbols,
  error,
} = require('../helpers.js');
const { newShinyReportThread } = require('../database.js');
const { shinyVerifierRoleID } = require('../config.js');

module.exports = {
  name        : 'newshiny',
  aliases     : ['newchannel'],
  description : 'Create a new channel when a new shiny has been released',
  args        : [
    {
      name: 'pokemon',
      type: 'STRING',
      description: 'Name of the Pokemon to create a thread for',
      required: true,
    },
    {
      name: 'symbol',
      type: 'STRING',
      description: 'Aquire method symbols',
      required: false,
      choices: Object.entries(obtainMethodSymbols).map(([key, symbol]) => ({ name: key, value: symbol })),
    },
    {
      name: 'symbol2',
      type: 'STRING',
      description: 'Aquire method symbols',
      required: false,
      choices: Object.entries(obtainMethodSymbols).map(([key, symbol]) => ({ name: key, value: symbol })),
    },
    {
      name: 'symbol3',
      type: 'STRING',
      description: 'Aquire method symbols',
      required: false,
      choices: Object.entries(obtainMethodSymbols).map(([key, symbol]) => ({ name: key, value: symbol })),
    },
    // TODO: is there a channel type?
    {
      name: 'channel',
      type: 'STRING',
      description: 'Channel name to create thread in',
      required: false,
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (interaction, args) => {
    const pokemon = interaction.options.get('pokemon').value;
    const symbol = interaction.options.get('symbol')?.value;
    const symbol2 = interaction.options.get('symbol2')?.value;
    const symbol3 = interaction.options.get('symbol3')?.value;
    let channel_name = interaction.options.get('channel')?.value;

    const new_thread_name = `${pokemon}${symbol ? `-${symbol}` : ''}${symbol2 ? `-${symbol2}` : ''}${symbol3 ? `-${symbol3}` : ''}-🆕`;

    // Get the channel to create the thread in
    channel_name = channel_name || pokemon[0].toLowerCase();
    const channel = interaction.guild.channels.cache.find(channel => channel.type == 'GUILD_TEXT' && channel.name == channel_name);
    if (!channel) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`Couldn't find channel \`${channel_name}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Check the thread doesn't already exist
    const thread_exist = interaction.guild.channels.cache.find(channel => channel.type == 'GUILD_PUBLIC_THREAD' && channel.name.toLowerCase().startsWith(pokemon.toLowerCase()));
    if (thread_exist) {
      const embed = new MessageEmbed()
        .setColor('#e74c3c')
        .setDescription(`A thread for this Pokemon already exist:\n${thread_exist}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Create the thread
    const thread = await channel.threads.create({
      name: new_thread_name,
      autoArchiveDuration: 'MAX',
      reason: `${pokemon} shiny reports!`,
    }).catch(error);

    // Add to the database
    newShinyReportThread(pokemon, thread.id, [symbol, symbol2, symbol3].join(''));

    // Ping all shiny verifiers (this will auto join them to the thread)
    const botMsg = await thread.send(`${pokemon} - ready for reports\n<@&${shinyVerifierRoleID}>`);
    botMsg.delete().catch(error);

    // Add to mod log
    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **Action:** Created new shiny thread
      **Thread:** ${thread}`);

    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setDescription(`New thread created successfully:\n${thread}`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
