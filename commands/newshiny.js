const { statusSymbols } = require('../helpers.js');

module.exports = {
  name        : 'newshiny',
  aliases     : ['newchannel'],
  description : 'Create a new channel when a new shiny has been released',
  args        : ['pokemon', 'hatch, research?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    const pokemon = args.shift().toLowerCase();

    // Get the icons to be added to the pokemon
    const icons = ['new', ...args, 'unconfirmed'].filter(icon=>statusSymbols[icon]).map(icon=>statusSymbols[icon]);
    const new_channel_name = `${pokemon}-${icons.join('-')}`;

    // Get the category
    const category_name = pokemon[0].toUpperCase();
    const category_channel = msg.guild.channels.find(channel => channel.type == 'category' && channel.name == category_name);
    if (!category_channel) return msg.reply(`Couldn't find category \`${category_name.toUpperCase()}\``);

    // Check the channel doesn't already exist
    const channel_exist = msg.guild.channels.find(channel => channel.name.startsWith(pokemon));
    if (channel_exist) return msg.reply([`This channel already exist:`, channel_exist]);

    // Create the channel, move to the correct category, sync permissions
    const new_channel = await msg.guild.createChannel(new_channel_name, { type: 'text' });
    await new_channel.setParent(category_channel.id);
    await new_channel.lockPermissions();

    const channels = msg.guild.channels.filter(channel => channel.parent && channel.parent.id == category_channel.id).array().sort((a,b)=>a.name.localeCompare(b.name));

    // Order the channel alphabetically
    const index = channels.findIndex(channel => channel.id == new_channel.id);
    const new_position = channels[index + (index ? -1 : 1)].position + (index ? 1 : 0);
    await new_channel.setPosition(new_position);

    return msg.channel.send(['New channel created successfully!', new_channel]);
  }
};
