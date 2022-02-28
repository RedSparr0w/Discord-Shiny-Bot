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
