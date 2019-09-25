const { tables, getTop } = require('../database.js');

module.exports = {
  name        : 'top',
  aliases     : ['leaderboard'],
  description : 'Get a list of users ordered by most points in a particular table\n\ttable: reports, verifications, entries',
  args        : ['amount(10), table(reports), notify(false)?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    const amount = +(args.find(arg=>/^\d+$/.test(arg)) || 10);
    const table = args.find(arg=>new RegExp(`^(${Object.keys(tables).join('|')})$`).test(arg)) || 'reports';
    const notify = JSON.parse(args.find(arg=>/^(true|false)$/.test(arg)) || 'false');

    // Check user has entered a valid amount
    if (isNaN(amount) || amount < 1 || amount > 40) return msg.channel.send('Invalid amount specified, Must be between 1 and 40...');

    // Check user has entered a valid table
    if (!Object.keys(tables).includes(table)) return msg.channel.send('Invalid table...');

    const results = await getTop(amount, table);

    const output = [`__***Top ${results.length} ${tables[table]}:***__`, ...results.map((res, place) => `**#${place + 1}** _\`(${res.points.toLocaleString('en-NZ')} ${table})\`_ ${msg.guild.members.get(res.user) || 'Inactive Member'}`)];
    if (output.join('\n').length >= 2000)
      return msg.reply(`Sorry this list is too large for discord, try a smaller amount`);

    return notify ?
      msg.channel.send(output) :
      msg.channel.send('Gathering Data...').then(m=>m.edit(output));
  }
};
