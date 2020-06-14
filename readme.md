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

# RRB Messaging

The MemeHub Bot uses [redis-request-broker](https://www.npmjs.com/package/redis-request-broker) to send messages and requests between components via the redis pub/sub system.

## Messages

 - `events:vote`: A user issued a vote
   ```ts
   {
     vote_type: string // The type of the vote, as deined in vote-types.json
     new_count: number // The new amount of votes of this type on the meme
     meme_id: string // The if of the meme
     user_id: string // The id of the user that issued the vote
     poster_id: string // The id of the user that posted the meme
     self_vote: boolean // Weather the poster voted his own meme (after the change)
   }
   ```
 - `events:retract-vote`: A user retracted a vote
   ```ts
   {
     vote_type: string // The type of the vote, as deined in vote-types.json
     new_count: number // The new amount of votes of this type on the meme
     meme_id: string // The if of the meme
     user_id: string // The id of the user that issued the vote
     poster_id: string // The id of the user that posted the meme
     self_vote: boolean // Weather the poster voted his own meme (after the change)
   }
   ```
 - `events:post`: A user posted a meme
   ```ts
   {
     meme_id: string // The id of the meme that got posted
     poster_id: string // The id of the user that posted the meme
   }
   ```
 - `logging:log`: A log message
   ```ts
   {
     level: string // The level of the log, as defined in the MemeHub-Logger
     component: string // The component that send the log
     instance: string // The instance that send the log
     title: string // The title of the log
     data?: any // Optional. Any data that belongs to the log
   }
   ```

## Requests
 - `bot-token`: Request the currently used bot token
    - Worker: `MemeHub-Bot`
    - Request data:
      ```ts
      // (none)
      ```
    - Response data:
      ```ts
      string // The bot token
      ```
 - `limits:may`: Reqeusts weather a user may issue a post due to the post limit
    - Worker: `MemeHub-Limits`
    - Request data:
      ```ts
      {
        user_id: string // The id of the user in question
      }
      ```
    - Response data:
      ```ts
      boolean // Weather the user may post right now
      ```
    