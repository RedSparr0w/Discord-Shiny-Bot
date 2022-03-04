const { MessageEmbed } = require('discord.js');
const { getShinyReports } = require('../database.js');
const { postPages } = require('../helpers.js');
const { getSymbolFromDate, statusSymbols } = require('../other/shinySquad.js');
const symbolValues = [
  '🆕',
  '🔴',
  '🟠',
  '🟡',
  '🔵',
  '🟢',
];

module.exports = {
  name        : 'list',
  aliases     : [],
  description : 'Get a list of shiny Pokemon report stauses',
  args        : [
    {
      name: 'filter',
      type: 'STRING',
      description: 'Filter by status',
      required: false,
      choices: [
        ...Object.entries(statusSymbols).map(([key, symbol]) => ({ name: key, value: symbol })),
        ...Object.entries(statusSymbols).map(([, symbol]) => ({ name: symbol, value: symbol })),
      ],
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  channels    : [
    'talk-to-the-prof',
    'prof-willow-mods',
    'prof-willow-admins',
  ],
  execute     : async (interaction) => {
    const filter = interaction.options.get('filter')?.value;

    let results = await getShinyReports();
    // TODO: exclude locked threads?
    // Filter based on symbols if thread unlocked
    // Filter based on locked/unlocked status otherwise
    if (filter) results = results?.filter(result => (result.unlocked && (result.symbols.split('').includes(filter) || getSymbolFromDate(result.date) == filter)) || filter == (result.unlocked ? statusSymbols.unlocked : statusSymbols.locked));

    if (!results || !results.length) {
      const embed = new MessageEmbed()
        .setColor('#3498db')
        .setDescription(`No results found with the following filter \`${filter}\``);
      return interaction.reply({ embeds: [embed] });
    }

    const resultsText = results
      .sort((a,b) => b.unlocked - a.unlocked || symbolValues.indexOf(getSymbolFromDate(a.date)) - symbolValues.indexOf(getSymbolFromDate(b.date)) || a.pokemon.localeCompare(b.pokemon))
      .map((res) => `<#${res.thread}>`);
    const items_per_page = 30;


    const pages = new Array(Math.ceil(results.length / items_per_page)).fill('').map(page => {
      const embed = new MessageEmbed().setColor('#3498db');
      // Setup our embeds
      embed.setDescription(resultsText.splice(0, items_per_page).join('\n'));
      // Return our message object
      return { content: '__***Current shiny report statuses:***__', embeds: [embed] };
    });

    postPages(interaction, pages, 1);
  },
};
