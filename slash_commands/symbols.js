const { MessageEmbed } = require('discord.js');
const { modLog } = require('../other/mod/functions.js');
const { error } = require('../helpers.js');
const { getShinyReport, setShinyReportSymbols } = require('../database.js');
const { obtainMethodSymbols, getSymbolFromDate } = require('../other/shinySquad.js');

module.exports = {
  name        : 'symbols',
  description : 'Update a shiny Pokemons obtain method symbols.',
  args        : [
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
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_THREADS'],
  userperms   : ['MANAGE_THREADS'],
  execute     : async (interaction, args) => {
    const symbol = interaction.options.get('symbol')?.value;
    const symbol2 = interaction.options.get('symbol2')?.value;
    const symbol3 = interaction.options.get('symbol3')?.value;

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

    // Update thread symbols
    const status = getSymbolFromDate(new Date(report.date));
    const new_thread_name = `${report.pokemon}${symbol ? ` | ${symbol}` : ''}${symbol2 ? ` | ${symbol2}` : ''}${symbol3 ? ` | ${symbol3}` : ''} | ${status}`;

    // Add to the database
    setShinyReportSymbols(thread.id, [symbol, symbol2, symbol3].join(''));
    await thread.edit({ name: new_thread_name }).catch(e => error('Unable to update thread name:', e));

    // Add to mod log
    modLog(interaction.guild,
      `**Mod:** ${interaction.member.toString()}
      **Action:** Updated thread symbols
      **Thread:** ${thread}`);

    const embed = new MessageEmbed()
      .setColor('#2ecc71')
      .setDescription('Updated symbols successfully!');
    return interaction.reply({ embeds: [embed] });
  },
};
