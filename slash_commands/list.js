const { MessageEmbed } = require('discord.js');
const { getShinyReports } = require('../database.js');
const { postPages } = require('../helpers.js');
const { getSymbolFromDate } = require('../other/shinySquad.js');
const symbolValues = [
  '🆕',
  '🔴',
  '🟠',
  '🟡',
  '🔵',
  '🟢',
];

// TODO: exclude locked threads
module.exports = {
  name        : 'list',
  aliases     : [],
  description : 'Get a list of shiny Pokemon report stauses',
  args        : [],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  channels    : [
    'prof-willow-admins',
    'prof-willow-mods',
    'talk-to-the-prof',
  ],
  execute     : async (interaction) => {
    const results = await getShinyReports();
    const resultsText = results
      .sort((a,b) => symbolValues.indexOf(getSymbolFromDate(a.date)) - symbolValues.indexOf(getSymbolFromDate(b.date)) || a.pokemon.localeCompare(b.pokemon))
      .map((res) => `<#${res.thread}>`);
    const items_per_page = 30;


    const pages = new Array(Math.ceil(results.length / items_per_page)).fill('').map(page => {
      const embed = new MessageEmbed().setColor('#3498db');
      // Setup our embeds
      embed.setDescription(resultsText.splice(0, items_per_page).join('\n'));
      // Return our message object
      return { content: '__***Current shiny report statuses:***__', embeds: [embed] };
    });

    postPages(interaction, pages, 1, true);
  },
};
