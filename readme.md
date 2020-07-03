# Setup

  - Install node and npm from [here](https://nodejs.org/en/)
  - Get a working MongoDB instance (see below)
  - Get a working Redis instace (see below)
  - Run `npm i`
  - Create a bot using the [@BotFather](https://telegram.me/botfather) in Telegram
  - Add the bot to a group and find the group id ([How-To](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id))
  - Copy all the `*.template.json` files to `*.json` and configure your settings

## MongoDB

You will need a MongoDB database. The schema is created on the fly. Collection names and the databases to use are set in the `config.json`.

A convinient way to get started is to use a free atlas instance in the cloud ([Link](https://www.mongodb.com/cloud/atlas)).

## Redis

You will need a running redis instance. An easy way is to use a docker-compose if you have docker set up ([Link](https://hub.docker.com/r/rediscommander/redis-commander)).

# Running

`npm run start`

# Used frameworks, libaries and technologies

  - [Telegraf](https://telegraf.js.org/#/?id=telegraf-js)
  - [MongoDB](https://www.mongodb.com/) ([NodeJS driver](https://mongodb.github.io/node-mongodb-native/))
  - [Redis](https://redis.io/) ([NodeJS driver](https://www.npmjs.com/package/redis))
  - [redis-request-broker](https://www.npmjs.com/package/redis-request-broker)

# Other resources

  - See [messages.md](/messages.md) for a list of messages sent over rrb
  - See [commands.md](/commands.md) for a list of commands that the bot supports