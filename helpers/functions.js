const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const request = require('request');
const { error } = require('./logging');
const { formatSecondsFullLetters } = require('./conversion');

const postPages = async (interaction, pages, page = 1, msgEdit = false) => {
  const updateButtons = async (i, editPost = true) => {
    const prev = buttons.components.find(b => b.label == 'Prev');
    if (page <= 0) {
      prev.disabled = true;
      if (editPost) await i.editReply({ components: [buttons] });
    } else {
      prev.disabled = false;
      if (editPost) await i.editReply({ components: [buttons] });
    }
    const next = buttons.components.find(b => b.label == 'Next');
    if (page >= pages.length - 1) {
      next.disabled = true;
      if (editPost) await i.editReply({ components: [buttons] });
    } else {
      next.disabled = false;
      if (editPost) await i.editReply({ components: [buttons] });
    }
  };

  // page number should be 1 lower than expected for array
  page = Math.max(1, Math.min(pages.length, page)) - 1;
  const customID = randomString(6);

  // Send the default page
  await interaction.reply(msgEdit ? 'Loading...' : pages[page]);
  if (msgEdit) await interaction.editReply(pages[page]);

  // Don't add the reactions if only 1 page
  if (pages.length <= 1) return;

  const buttons = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId(`prev${customID}`)
        .setLabel('Prev')
        .setStyle('SECONDARY')
        .setEmoji('⬅'),
      new MessageButton()
        .setCustomId(`next${customID}`)
        .setLabel('Next')
        .setStyle('SECONDARY')
        .setEmoji('➡')
    );

  updateButtons(interaction);

  // Filters
  const backwardsFilter = (i) => i.customId === `prev${customID}` && i.user.id === interaction.user.id;
  const forwardsFilter = (i) => i.customId === `next${customID}` && i.user.id === interaction.user.id;

  // Allow reactions for up to x ms
  const timer = 2e5; // (200 seconds)
  const backwards = interaction.channel.createMessageComponentCollector({filter: backwardsFilter, time: timer});
  const forwards = interaction.channel.createMessageComponentCollector({filter: forwardsFilter, time: timer});

  backwards.on('collect', async i => {
    page = page <= 0 ? 0 : --page;
    await i.deferUpdate();
    updateButtons(i, false);
    await i.editReply({...pages[page], ...{components: [buttons]}});
  });

  forwards.on('collect', async i => {
    page = page >= pages.length - 1 ? pages.length - 1 : ++page;
    await i.deferUpdate();
    updateButtons(i, false);
    await i.editReply({...pages[page], ...{components: [buttons]}});
  });

  // Clear all the reactions once we aren't listening
  backwards.on('end', () => interaction.editReply({ components: [] }).catch(O_o=>{}));

  return buttons;
};

const upperCaseFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();

const randomFromArray = arr => arr[Math.floor(Math.random() * arr.length)];

const addOrderedReactions = async (message, reactions) => {
  const addReaction = (reaction, cb) =>{
    setTimeout(async () => {
      await message.react(reaction).catch(O_o=>{});
      cb();
    }, 100);
  };

  reactions.reduce((promiseChain, reaction) => promiseChain.then(() => new Promise((resolve) => {
    addReaction(reaction, resolve);
  })), Promise.resolve());
};

const randomString = (length = 6) => {
  let str = '';
  while(str.length < length) {
    str += Math.random().toString(36).substring(2);
  }
  return str.substring(0, length);
};

module.exports = {
  postPages,
  upperCaseFirstLetter,
  randomFromArray,
  addOrderedReactions,
  randomString,
};
