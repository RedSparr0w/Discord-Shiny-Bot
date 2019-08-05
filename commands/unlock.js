const {
  error,
  statusSymbols,
  isActiveChannel,
} = require('../helpers.js');

module.exports = {
  name        : 'unlock',
  aliases     : [],
  description : 'Move channel back to correct category',
  args        : ['hatch, research?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['SEND_MESSAGES', 'MANAGE_CHANNELS'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args) => {
    msg.delete().catch(e=>error('Unable to delete message:', e));

    if (isActiveChannel(msg.channel)) return msg.reply(`This channel is already unlocked.`);

    // Fetch the 100 most recent messages
    const current_messages = await msg.channel.fetchMessages({ limit: 100 });
    // Unpin the latest sighting messages (must be within the 100 most recent messages)
    current_messages.filter(m=>m.pinned).forEach(m=>{
      m.unpin().catch(e=>error('Unable to unpin message:', e));
    });

    // Get the icons to be added to the pokemon
    const icons = ['new', ...args, 'unconfirmed'].filter(icon=>statusSymbols[icon]).map(icon=>statusSymbols[icon]);
    const new_channel_name = `${msg.channel.name.replace(/\W+/,'')}-${icons.join('-')}`;

    // Get the category
    const category_name = new_channel_name[0].toUpperCase();
    const category_channel = msg.guild.channels.find(channel => channel.type == 'category' && channel.name == category_name);
    if (!category_channel) return msg.reply(`Couldn't find category \`${category_name}\``);

    // Create the channel, move to the correct category, sync permissions
    const channel_to_unlock = msg.channel;
    await channel_to_unlock.edit({ name: new_channel_name });
    await channel_to_unlock.setParent(category_channel.id);
    await channel_to_unlock.lockPermissions();

    // Get all channels in the category, and sort alphabetically
    const channels = msg.guild.channels.filter(channel => channel.parent && channel.parent.id == category_channel.id).array().sort((a,b)=>a.name.localeCompare(b.name));

    // If this is the only channel in the category, we are done
    if (channels.length <= 1) return;

    // Order the channel alphabetically
    const index = channels.findIndex(channel => channel.id == channel_to_unlock.id);
    const new_position = channels[index + (index ? -1 : 1)].position + (index ? 1 : 0);
    await channel_to_unlock.setPosition(new_position);

    const date = new Date();
    return msg.channel.send(`Channel unlocked: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`);
  }
};
