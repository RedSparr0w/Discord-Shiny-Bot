const { unlockPokemon } = require('../database.js');
const {
  error,
  obtainMethodSymbols,
  statusSymbols,
  isActiveChannel,
} = require('../helpers.js');

module.exports = {
  name        : 'unlock',
  aliases     : [],
  description : 'Move channel back to correct category',
  args        : [`${Object.keys(obtainMethodSymbols).join(', ')}?`],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    msg.delete().catch(e=>error('Unable to delete message:', e));

    // TODO: Fix this check as it is unreliable.
    if (isActiveChannel(msg.channel)) return msg.reply(`This channel is already unlocked.`);

    // Fetch the 100 most recent messages
    const current_messages = await msg.channel.messages.fetch({ limit: 100 });
    // Unpin the latest sighting messages (must be within the 100 most recent messages)
    current_messages.filter(m=>m.pinned).forEach(m=>{
      m.unpin().catch(e=>error('Unable to unpin message:', e));
    });

    // Filter out bad icon names
    const icon_names = args.filter(icon=>obtainMethodSymbols[icon]);
    // Get the icons to be added to the pokemon
    const icons = ['new', ...icon_names, 'unconfirmed'].map(icon=>statusSymbols[icon]);
    const new_channel_name = `${msg.channel.name.replace(/\W+$/,'')}-${icons.join('-')}`;

    // Get the category
    const category_name = new_channel_name[0].toUpperCase();
    const category_channel = msg.guild.channels.cache.find(channel => channel.type == 'category' && channel.name == category_name);
    if (!category_channel) return msg.reply(`Couldn't find category \`${category_name}\``);

    const channel_to_unlock = msg.channel;

    // Get all channels in the category, and sort alphabetically
    const channels = [...msg.guild.channels.cache.filter(channel => channel.parent && channel.parent.id == category_channel.id).array(), channel_to_unlock].sort((a,b)=>a.name.localeCompare(b.name));

    let position;
    // If this is the only channel in the category, we are done
    if (channels.length > 1) {
      // Order the channel alphabetically
      const index = channels.findIndex(channel => channel.id == channel_to_unlock.id);
      position = channels[index + (index ? -1 : 1)].position + (index ? 1 : 0);
    }

    // Update name, move to the correct category, sync permissions
    await channel_to_unlock.edit({ name: new_channel_name, position, parentID: category_channel.id, lockPermissions: true }, 'Unlock Shiny');

    unlockPokemon(msg.channel.name.replace(/\W+$/, ''), icon_names);

    const date = new Date();
    return msg.channel.send(`Channel unlocked: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`);
  }
};
