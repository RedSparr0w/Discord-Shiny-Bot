const { error, warn, updateChannelNames, updateLeaderboard } = require('../helpers.js');
const { addUserReport, addUserVerification } = require('../database.js');

function applyReporterRole(member, points = 0){
  const roles = {
      5: '601229631407783967', // Shiny Reporter
      20: '601230476094603275', // Shiny Hunter
      50: '601230543950184468', // Shiny Master
      100: '601230605027377152', // Shiny Legend
    };

  if (roles[points]){
    member.addRole(roles[points], `Reached ${points} reports`).catch(e=>error('Unable to assign role:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
    const role_to_remove = Object.keys(roles).filter(level=>(+points) > (+level)).pop();
    if (role_to_remove)
      member.removeRole(roles[role_to_remove], `Reached ${points} reports (old role)`).catch(e=>error('Unable to remove role:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
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
    msg.delete().catch(e=>error('Unable to delete message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));

    // Calculate the date specified
    const date = new Date(Date.parse(`${month} ${args[0]}, ${args[1] || new Date().getFullYear()}`));

    // Unpin the last latest sighting message (must be within the previous 100)
    msg.channel.fetchMessages({
        limit: 100 // Fetch last 100 messages. (maximum amount)
      }).then((messages) => {
        messages.forEach((m) => {
          if (m.pinned){
            m.unpin().catch(e=>error('Unable to unpin message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
          }
        });
      });

    // Send message stating newest date, then Pin it
    msg.channel.send(`Most Recent Sighting: ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`).then(m=>{
      m.pin().then(m=>{
        updateChannelNames(msg.guild);
      }).catch(e=>error('Unable to pin message:\n', `\tMessage: ${e.message}\n`, `\tError No: ${e.errno}\n`, `\tCode: ${e.code}\n`));
    });

    // Add 1 point to the verifier
    addUserVerification(msg.author.id);
    // Await "Thank You" message, then add 1 point to the reporter
    const filter = m => m.author.id === msg.author.id && m.mentions.members.size;
    // errors: ['time'] treats ending because of the time limit as an error
    msg.channel.awaitMessages(filter, { max: 1, time: 120000, errors: ['time'] })
      .then(async collected => {
        const member = collected.first().mentions.members.first();
        const points = await addUserReport(member.id);
        updateLeaderboard(msg.guild);
        applyReporterRole(member, points);
      })
      .catch(collected => warn('No thanks given after 2 minutes'));
  }
};
