const { error, statusSymbols, getShinyStatusList } = require('../helpers.js');

module.exports = {
  name        : 'list',
  aliases     : ['shinystatus'],
  description : 'List Pokemon with the specified current status',
  args        : ['all, confirmed, ok, warning, danger, unconfirmed, new, research, hatch?', ],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['MANAGE_MESSAGES', 'SEND_MESSAGES'],
  userperms   : [],
  execute     : async (msg, args) => {
    msg.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));

    // If user doesn't have required perms, or no arguments supplied, set the default arguments
    if (msg.channel.type === 'text' && msg.channel.memberPermissions(msg.member).missing(['MANAGE_MESSAGES']).length || !args.length)
      args = ['warning', 'danger'];

    const filterSymbols = args.filter(status=>status in statusSymbols).map(status=>statusSymbols[status]);

    if (filterSymbols.length)
      msg.channel.send(`Fetching Pokémon with ${filterSymbols.join(' ')} status...`);
    else
      msg.channel.send(`Fetching the current shiny status of all Pokémon...`);

    // Gather information of pokemon statuses
    const pokemonList = await getShinyStatusList(msg.guild);
    const output = [];
    Object.keys(pokemonList).sort().forEach(pokemon => {
      const hasMatch = filterSymbols.some(symbol => pokemonList[pokemon].channelName.includes(symbol));
      if (hasMatch)
        output.push(`${pokemonList[pokemon].symbol} ${pokemonList[pokemon].dateStr} - ${pokemonList[pokemon].channel}`);
    });

    // Check if the list is empty
    if (output.length){
      msg.channel.send(output, { split: true });
    } else {
      msg.channel.send('Nothing to report!');
    }
  }
};
