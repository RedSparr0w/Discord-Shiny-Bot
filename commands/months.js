const {
  error,
  warn,
  isActiveChannel,
  updateChannelName,
  updateLeaderboard,
  updateChampion,
} = require('../helpers.js');
const {
  addUserReport,
  addUserVerification,
} = require('../database.js');

function applyReporterRole(member, points = 0){
  const roles = {
      5: '601229631407783967',   // Shiny Reporter
      20: '601230476094603275',  // Shiny Hunter
      50: '601230543950184468',  // Shiny Master
      100: '601230605027377152', // Shiny Legend
    };

  if (roles[points]){
    member.addRole(roles[points], `Reached ${points} reports`).catch(e=>error('Unable to assign role:', e));
    const role_to_remove = Object.keys(roles).filter(level=>(+points) > (+level)).pop();
    if (role_to_remove)
      member.removeRole(roles[role_to_remove], `Reached ${points} reports (old role)`).catch(e=>error('Unable to remove role:', e));
  }
}

module.exports = {
  name        : 'jan',
  aliases     : [
    // Short months
    'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    // Full months
    'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  ],
  description : 'Set the latest sighting of a shiny Pokémon',
  args        : ['day', 'year?'],
  guildOnly   : true,
  cooldown    : 3,
  botperms    : ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'SEND_MESSAGES'],
  userperms   : ['MANAGE_MESSAGES'],
  execute     : async (msg, args, month) => {
    // Delete the users message with the command
    msg.delete().catch(e=>error('Unable to delete message:', e));

    if (!isActiveChannel(msg.channel)) return;

    // Calculate the date specified
    const date = new Date(Date.parse(`${month} ${args[0]}, ${args[1] || new Date().getFullYear()}`));

    // Fetch the 100 most recent messages
    const current_messages = await msg.channel.fetchMessages({ limit: 100 });
    // Unpin the latest sighting messages (must be within the 100 most recent messages)
    current_messages.filter(m=>m.pinned).forEach(m=>{
      m.unpin().catch(e=>error('Unable to unpin message:', e));
    });

    // Send message stating newest date, then Pin it
    msg.channel.send(`Most Recent Sighting: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`).then(m=>{
      m.pin().then(m=>{
        // Update the name once we have pinned the latest sighting
        updateChannelName(msg.channel);
      }).catch(e=>error('Unable to pin message:', e));
    });

    // Add 1 point to the verifier
    addUserVerification(msg.author.id);
    // Await "Thank You" message, then add 1 point to the reporter(s)
    const filter = m => m.author.id === msg.author.id && m.mentions.members.size;
    // errors: ['time'] treats ending because of the time limit as an error
    msg.channel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] })
      .then(collected => {
        collected.first().mentions.members.forEach(async member=>{
          // Add a point, get current points
          const points = await addUserReport(member.id);
          // Check/update the users role
          applyReporterRole(member, points);
          // Update the leaderboard
          updateLeaderboard(msg.guild);
          // Update our current champion
          updateChampion(msg.guild);
        });
      })
      .catch(collected => warn(`No thanks given by ${msg.author.tag} after 2 minutes`));
  }
};
