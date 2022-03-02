module.exports = {
  development: true,
  prefix: '!',
  token: 'YOUR_BOTS_TOKEN_HERE',
  // Bot owner ID, used for eval and other commands
  ownerID: 'YOUR_DISCORD_USER_ID (optional)',
  // Channels
  backupChannelID: 'DISCORD_BACKUP_CHANNEL_ID (optional)',
  modLogChannelID: 'DISCORD_MOD_LOG_CHANNEL_ID (optional)',
  shinyStatusChannelID: 'DISCORD_SHINY_STATUS_CHANNEL_ID (optional)',
  leaderboard: {
    channelID: 'DISCORD_LEADERBOARD_CHANNEL_ID (optional)',
    messageID: 'DISCORD_LEADERBOARD_MESSAGE_ID (optional)',
  },
  // Our roles
  shinyVerifierRoleID: 'DISCORD_SHINY_VERIFIER_ROLE_ID (optional)',
  reporterRoles: [
    { id: '947703619879309355', name: 'Shiny Squad', amount: 0 },
    { id: '947703619879309357', name: 'Shiny Reporter', amount: 5 },
    { id: '947703619879309358', name: 'Shiny Hunter', amount: 20 },
    { id: '947703619879309359', name: 'Shiny Master', amount: 50 },
    { id: '947703619879309360', name: 'Shiny Legend', amount: 100 },
    { id: '947703619879309361', name: 'Shiny Champion', amount: Infinity },
  ],
};
