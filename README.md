# Shiny Squad Discord Bot

This is the code for the Shiny Squad Discord Bot. In order to run it locally for development, you must set up a [Discord Application](https://discord.com/developers/applications) with a bot token, and invite it to a server that you can manage.

## Steps for running:

* Copy `_config.js` to `config.js` and change the settings
* Run `npm ci` to install dependencies
* Run `npm start` to start the server
* Open the invite link provided in the console, and add the bot to a server, then grant it a role with the permissions needed

## Permissions:

* Create Public/Private Threads - Required for shiny reports
* Manage Threads - Required for shiny reports
* Read Text Channels & See Voice Channels - Needs this for any channel you want it to manage messages
* Send Messages - Send messages
* Manage Messages - Allow the bot to delete and pin messages
* Embedded Links - Allows the bot to use embeds _(most commands make use of these)_
* Attach files - Allow the bot to post database backups in the backup channel and attach images
* Mention `@everyone`, `@here` and All Roles
* Kick/Ban Members - If you want to make use of the `/kick` and `/ban` commands
* Manage Roles - Allow the bot to assign @shiny verifications role _(must be placed above this role in the roles hiarachy)_

## Docker:

Download the repo.
Everything is included to run the bot in a Docker instance.
Run `docker-compose up -d`

The Docker instance is setup to use PM2 and `pm2-auto-pull`.
`pm2-auto-pull` will automatically pull from whichever branch you have selected and restart the bot whenever there are updates.
