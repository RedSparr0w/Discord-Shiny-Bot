const { tables, getAll } = require('../database.js');

module.exports = {
  name        : 'draw',
  aliases     : [],
  description : 'Draw a random user from a table',
  args        : ['amount(1), table(reports), notify(true)?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES'],
  userperms   : ['MANAGE_GUILD'],
  execute     : async (msg, args) => {
    let amount = +(args.find(arg=>/^\d+$/.test(arg)) || 1);
    const table = args.find(arg=>new RegExp(`^(${Object.keys(tables).join('|')})$`).test(arg)) || 'reports';
    const notify = JSON.parse(args.find(arg=>/^(true|false)$/.test(arg)) || 'true');

    // Check user has entered a valid amount
    if (isNaN(amount) || amount < 1 || amount > 20) return msg.reply('Invalid amount specified, Must be between 1 and 40...');

    // Check user has entered a valid table
    if (!Object.keys(tables).includes(table)) return msg.channel.send('Invalid table...');

    const results = await getAll(table);
    // Check we have enough results
    if (amount > results.length) amount = results.length;

    // Split results into 1 item per point
    let items = [];
    results.forEach((result, index)=>{
      for(let i = 0; i < result.points; i++)
        items.push(index);
    });

    msg.channel.send(`__***Drawing ${amount} random user${amount > 1 ? 's' : ''} out of ${results.length} users, with ${items.length} ${table}***__`);

    // Draw the winners
    const winners = [];
    for (let i = 0; i < amount; i++){
      const winner = items[Math.floor(Math.random() * items.length)];
      winners.push(results[winner].user);
      // Remove the user from the list so they don't win twice
      items = items.filter(i=>i!=winner);
    }
    const output = winners.map((user, place)=>`**#${place + 1}** ${msg.guild.members.get(user) || 'Inactive Member'}`);

    return notify ?
      msg.channel.send(output) :
      msg.channel.send('Gathering Data...').then(m=>m.edit(output));
  }
};
