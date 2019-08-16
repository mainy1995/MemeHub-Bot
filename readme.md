# Setup

  - Install node and npm from [here](https://nodejs.org/en/)
  - Fork and clone the repo
  - Run `npm i` inside
  - Create a bot using the [@BotFather](https://telegram.me/botfather) in Telegram
  - Add the bot to a group and find the group id ([How-To](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id))
  - Make sure you have a working mongodb instance (see mongodb)
  - Copy `config.template.json` to `config.json` and configure your settings

# MongoDB

The bot uses mongodb for storing data. You only need to create a database, collections will be created on the fly. Collection names and the database to use are set in the `config.json`.

A convinient way to get started is to use a free atlas instance in the cloud ([Link](https://www.mongodb.com/cloud/atlas)).

# Running

Just run `npm run start`

# Frameworks

  - Telegraf:   https://telegraf.js.org/#/?id=telegraf-js  
  - μ-bot:      https://github.com/telegraf/micro-bot
