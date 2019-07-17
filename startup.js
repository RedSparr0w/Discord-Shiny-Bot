const {
  warn,
} = require('./helpers.js');

async function updateRules(bot){
  const guild_ID = '564171902269259776';
  const channel_ID = '600141168809869312';
  const message_ID = '601184762916503573';

  const guild = bot.guilds.get(guild_ID);
  if (!guild) return warn('updateRules():', '\n\tUnable to find guild.');

  const channel = guild.channels.find(c => c.id === channel_ID && c.type === 'text');
  if (!channel) return warn('updateRules():', '\n\tUnable to find channel.');

  let message = false;
  try {
    message = await channel.fetchMessage(message_ID);
  } catch(e){}

  const data = {
      "embed": {
        "fields": [
          {
            "name": "__***RULES:***__",
            "value": ":small_blue_diamond: All screenshots or videos MUST include the date caught and some portion of the Pokémon must be visible to confirm it is shiny.\n:small_blue_diamond: DO NOT report any hatched Pokémon unless they have an `🥚` beside their name.\n        _This is due to the fact we cannot verify them by the hatch date since an old egg can be hatched and it will have today's date on it._\n:small_blue_diamond: DO NOT report any stacked research Pokémon as this can result in bad reports since the date is determined when you catch it, not when you stacked the encounter.\n",
            "inline": false
          },
          {
            "name": "__***INFO:***__",
            "value": ":small_blue_diamond: Shiny baby Pokémon are located in their own category down the bottom of the list.\n:small_blue_diamond: Once a Moderator verifies a screenshot or video of a shiny, the most recent sighting date will be pinned to the corresponding channel for that Pokémon.\n",
            "inline": false
          },
          {
            "name": "__***ICONS:***__",
            "value": ":small_blue_diamond: We change the icons based on how many days it has been since a shiny has been seen.\n```cs\n✅ 0 - 5 days\n☑ 6 - 10 days\n⚠ 11 - 15 days\n🚫 15 + days\n```\n:small_blue_diamond: You may also notice the following icons on some Pokémon:\n```cs\n🆕 Shiny variant recently announced/released\n🕒 No shiny reports/verifications received yet\n📦 Obtainable via weekly research breakthrough\n🥚 Only obtainable via hatching eggs\n🔒 Out of rotation, currently unavailable\n```\n",
            "inline": false
          },
          {
            "name": "__***COMMANDS:***__",
            "value": "`!list` Will return a list of all pokemon that have `⚠ 🚫` shiny statuses",
            "inline": false
          },
        ],
        "title": "**Welcome to the Shiny Sqaud, Trainer!**",
        "description": "```http\nACCESS WILL BE GRANTED IN ONE MINUTE\nPLEASE READ ALL RULES WHILE YOU WAIT\n```",
      },
    };

  if (!message) {
    return channel.send(data);
  } else {
    return message.edit(data);
  }
}

async function startup(bot){
  updateRules(bot);
}

module.exports = startup;
