const { SECOND, HOUR } = require('./helpers/constants');

module.exports = {
  development: true,
  prefix: '!',
  token: 'YOUR_BOTS_TOKEN_HERE',
  // Bot owner ID, used for eval and other commands
  ownerID: 'YOUR_DISCORD_USER_ID (optional)',
  // Channel where the backup database should be sent
  backupChannelID: 'DISCORD_BACKUP_CHANNEL_ID (optional)',
  modLogChannelID: 'DISCORD_MOD_LOG_CHANNEL_ID (optional)',
  reporterRoles: [
    { id: '947703619879309355', name: 'Shiny Squad', amount: 0 },
    { id: '947703619879309357', name: 'Shiny Reporter', amount: 5 },
    { id: '947703619879309358', name: 'Shiny Hunter', amount: 20 },
    { id: '947703619879309359', name: 'Shiny Master', amount: 50 },
    { id: '947703619879309360', name: 'Shiny Legend', amount: 100 },
    { id: '947703619879309361', name: 'Shiny Champion', amount: Infinity },
  ],
  spamDetection: {
    ignoreChannels: ['channel-name'], // channel names or IDs
    spam: {
      amount: 4, // how many messages within timeframe count as spam (0 to disable)
      time: 3 * SECOND, // message count within x ms
      mute: 1 * HOUR, // how long to mute the user in ms
    },
    dupe: {
      amount: 3, // how many duplicate messages within timeframe count as spam (0 to disable)
      time: 30 * SECOND, // message count within x ms
      mute: 1 * HOUR, // how long to mute the user in ms
    },
  },
};
