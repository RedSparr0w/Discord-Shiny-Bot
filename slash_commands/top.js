const { getTop } = require('../database.js');
const { postPages } = require('../helpers.js');

module.exports = {
  name        : 'top',
  aliases     : ['leaderboard', 'lb'],
  description : 'Get a list of users with the most points in specific categories',
  args        : [
    {
      name: 'type',
      type: 'STRING',
      description: 'Leaderboard category',
      required: false,
      choices: [
        {
          name: 'Reports',
          value: 'reports',
        },
        {
          name: 'Verifications',
          value: 'verifications',
        },
        {
          name: 'Messages',
          value: 'messages',
        },
        {
          name: 'Commands',
          value: 'commands',
        },
      ],
    },
  ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'EMBED_LINKS'],
  userperms   : [],
  execute     : async (interaction) => {
    const type = interaction.options.get('type')?.value || 'reports';

    let pages, results, resultsText;
    switch(type) {
      /* Stat type top commands */
      case 'messages':
      case 'message':
      case 'msg':
        results = await getTop(100, 'messages');
        resultsText = results.map((res, place) => `**#${place + 1}** \`${res.amount ? res.amount.toLocaleString('en-NZ') : 0} messages\` <@!${res.user}>`);
        pages = new Array(Math.ceil(results.length / 10)).fill('').map(page => [`__***Top ${results.length} messages sent:***__`, ...resultsText.splice(0, 10)]).map(i => ({ content: i.join('\n') }));
        break;
      case 'commands':
      case 'command':
      case 'cmd':
        results = await getTop(100, 'commands');
        resultsText = results.map((res, place) => `**#${place + 1}** \`${res.amount ? res.amount.toLocaleString('en-NZ') : 0} commands\` <@!${res.user}>`);
        pages = new Array(Math.ceil(results.length / 10)).fill('').map(page => [`__***Top ${results.length} commands used:***__`, ...resultsText.splice(0, 10)]).map(i => ({ content: i.join('\n') }));
        break;
      case 'reports':
      case 'verifications':
      default:
        results = await getTop(100, type);
        resultsText = results.map((res, place) => `**#${place + 1}** \`${res.amount ? res.amount.toLocaleString('en-NZ') : 0} ${type}\` <@!${res.user}>`);
        pages = new Array(Math.ceil(results.length / 10)).fill('').map(page => [`__***Top ${results.length} ${type}:***__`, ...resultsText.splice(0, 10)]).map(i => ({ content: i.join('\n') }));
    }

    postPages(interaction, pages, 1, true);
  },
};
