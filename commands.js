const {
  log,
  info,
  debug,
  warn,
  error,
} = require('./functions.js');
const {
  splitter,
  statusSymbols,
  getSymbolFromDate,
  updateChannelNames,
  getShinyStatusList,
  isModerator,
} = require('./helpers.js');

const commands = {
  ping: (msg)=>{
    if (!msg.guild)
      return msg.author.send('Pong')
    if (isModerator(msg))
      return msg.channel.send('Pong')
  },
  help: (msg)=>{
    // Moderators only
    if (!isModerator(msg)) return;
    // Must be sent via guild channel
    if (!msg.guild) return msg.author.send('This command cannot be used via DM.');

    msg.channel.send(`Current commands:
\`\`\`http
!help: This message.
!ping: Pong, Check the bot is still responding.
!list [status]: Will reply with a list filtered by shiny status for each Pokémon.
  - status (optional): all, confirmed, ok, warning(default), danger(default).
!update: Update Pokémon channel names to reflect the current shiny status.
!rename: (alias) !update
\`\`\``);
  },
  list: async (msg, args)=>{
    // Must be sent via guild channel
    if (!msg.guild) return msg.author.send('This command cannot be used via DM.');

    msg.delete()
    // return only the requested pokemon by status
    // Only moderators can specify a filter
    if (!isModerator(msg) || !args.length)
      args = ['warning', 'danger'];
    const filterSymbols = args.filter(status=>status in statusSymbols).map(status=>statusSymbols[status]);
    const filters = new RegExp(filterSymbols.join('|'));
    if (!!filterSymbols.length)
      msg.channel.send(`Fetching Pokémon with ${filterSymbols.join(' ')} shiny status...`);
    else
      msg.channel.send(`Fetching the current shiny status of all Pokémon...`);

    // Gather information of pokemon statuses
    const pokemonList = await getShinyStatusList(msg.guild);
    const output = [];
    Object.keys(pokemonList).sort().filter(pokemon=>filters.test(pokemonList[pokemon].symbol)).forEach(pokemon => {
      output.push(pokemonList[pokemon].symbol + ' ' + pokemonList[pokemon].dateStr + ' - ' + pokemonList[pokemon].channel);
    });
    // If the list isn't empty, send it out.
    if (!!output.length){
      splitter(output.join('\n'), 1980).forEach(m => {
        msg.channel.send(m);
      });
    } else {
      msg.channel.send('Nothing to report!');
    }
  },
  update: (msg)=>{
    // Moderators only
    if (!isModerator(msg)) return;
    // Must be sent via guild channel
    if (!msg.guild) return msg.author.send('This command cannot be used via DM.');

    msg.channel.send(`Updating channel names with current shiny status...`);
    updateChannelNames(msg.guild);
    msg.channel.send(`Complete!`);
  },
  // Cannot be called directly as the function contains a capital letter
  latestSighting: (msg, args, month)=>{
    // Moderators only
    if (!isModerator(msg)) return;
      // Must be sent via guild channel
    if (!msg.guild) return msg.author.send('This command cannot be used via DM.');

    msg.delete().then().catch(e=>error('Error deleting message:\n', e));
    if (!args)
      return msg.channel.send(`Must specify date - \`${prefix}apr 10 [2019?]\``).then(m=>{m.delete()});
    let month = command;
    const date = new Date(Date.parse(`${month} ${args[0]}, ${args[1] || new Date().getFullYear()}`));
    msg.channel.fetchMessages({
      limit: 100 // Fetch last 100 messages.
    }).then((messages) => {
      messages.forEach((m) => {
        if (!!m.pinned){
          m.unpin();
        }
      });
    });
    msg.channel.send(`Most Recent Sighting: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`).then(m=>{
      m.pin();
      updateChannelNames(msg.guild);
    });
  },
}

const alias = {
  rename: commands.update,
  jan: commands.latestSighting,
  feb: commands.latestSighting,
  mar: commands.latestSighting,
  apr: commands.latestSighting,
  may: commands.latestSighting,
  jun: commands.latestSighting,
  jul: commands.latestSighting,
  aug: commands.latestSighting,
  sep: commands.latestSighting,
  oct: commands.latestSighting,
  nov: commands.latestSighting,
  dec: commands.latestSighting,
}

module.exports = { ...alias, ...commands}
