# Setup

  - Install node and npm from [here](https://nodejs.org/en/)
  - fork and clone the repo
  - run `npm i` inside
  - copy `config.template.json` to `config.json` and configure your settings
  - create a bot using the [@BotFather](https://telegram.me/botfather) in telegram
  - add the bot to a group and find the group id ([How-To](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id))
  - depending on your system, copy `start_bot.template.sh` (linux) or `start_bot.template.ps1` (Windows powershell) and set your bot token, which you got from the BotFather
  - make sure you have a working mongodb instance (see mongodb)

# MongoDB

The bot uses mongodb for storing data. You only need to create a database, collections will be created on the fly. Collection names and the database to use are set in the `config.json`.

A convinient way to get started is to use a free atlas instance in the cloud ([Link](https://www.mongodb.com/cloud/atlas)).

# Running

Just run the `start_bot.sh` / `start_bot.ps1`

# Frameworks

  - Telegraf:   https://telegraf.js.org/#/?id=telegraf-js  
  - μ-bot:      https://github.com/telegraf/micro-bot
