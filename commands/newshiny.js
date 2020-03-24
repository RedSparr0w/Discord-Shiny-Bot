const {
  obtainMethodSymbols,
  statusSymbols,
  error,
} = require('../helpers.js');

module.exports = {
  name        : 'newshiny',
  aliases     : ['newchannel'],
  description : 'Create a new channel when a new shiny has been released',
  args        : ['pokemon-name', `${Object.keys(obtainMethodSymbols).join(', ')}?`],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    const pokemon = args.shift().toLowerCase();

    // Filter out bad icon names
    const icon_names = args.filter(icon=>obtainMethodSymbols[icon]);
    // Get the icons to be added to the pokemon
    const icons = ['new', ...icon_names, 'unconfirmed'].map(icon=>statusSymbols[icon]);
    const new_channel_name = `${pokemon}-${icons.join('-')}`;

    // Get the category
    const category_name = pokemon[0].toUpperCase();
    const category_channel = msg.guild.channels.cache.find(channel => channel.type == 'category' && channel.name == category_name);
    if (!category_channel) return msg.reply(`Couldn't find category \`${category_name}\``);

    // Check the channel doesn't already exist
    const channel_exist = msg.guild.channels.cache.find(channel => channel.name.startsWith(pokemon));
    if (channel_exist) return msg.reply([`This channel already exist:`, channel_exist]);

    // Get all channels in the category, and sort alphabetically
    const channels = [...msg.guild.channels.cache.filter(channel => channel.parent && channel.parent.id == category_channel.id).array(), {name: new_channel_name}].sort((a,b)=>a.name.localeCompare(b.name));

    let position;
    // If this is the only channel in the category, we are done
    if (channels.length > 1){
      // Order the channel alphabetically
      const index = channels.findIndex(channel => channel.name == new_channel_name);
      if (index < 0) return msg.channel.send('Unable to move channel to correct position, will need to be done manually.');
      position = channels[index + (index ? -1 : 1)].position + (index ? 1 : 0);
    }

    // Create the channel, move to the correct category, sync permissions
    const new_channel = await msg.guild.channels.create(new_channel_name, { type: 'text', parent: category_channel.id, position, reason: 'New Shiny' }).catch(error);


    return msg.channel.send(['New channel created successfully!', new_channel]);
  }
};
