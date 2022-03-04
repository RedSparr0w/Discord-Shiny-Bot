const { MessageEmbed } = require('discord.js');
const { modLogChannelID } = require('../../config');
const { addScheduleItem } = require('../../database');
const { HOUR, error, formatDateToString } = require('../../helpers.js');

const modLog = (guild, logMessage) => {
  if (modLogChannelID) {
    const embed = new MessageEmbed().setColor('#3498db').setDescription(logMessage);
    guild.channels.cache.find(c => c.id == modLogChannelID || c.name == modLogChannelID)?.send({ embeds: [embed] });
  }
};

const mute = (member, time = 1 * HOUR) => {
  try {
    member.timeout(time, `User timedout by ${member.guild.me.displayName}-${member.guild.me.id}`).catch(e => error('Unable to timeout member:', e));
    if (time) {
      unmute(member, time);
    }
  } catch (e) {
    error('Unable to timeout member\n', e);
  }
};

const unmute = (member, time = 1 * HOUR) => {
  const date = Date.now();
  addScheduleItem('un-timeout', member.user, +date + time, `${member.guild.id}|${formatDateToString(time)}`);
};

module.exports = {
  modLog,
  mute,
  unmute,
};
