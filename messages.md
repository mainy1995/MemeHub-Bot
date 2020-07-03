# RRB Messaging

The MemeHub Bot uses [redis-request-broker](https://www.npmjs.com/package/redis-request-broker) to send messages and requests between components via the redis pub/sub system. Here is a list of messages that are sent over the network:

## Messages

On-way messaging (PUB/SUB)

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

Request and response messaging (RPC)

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
 - `limits:may-post`: Reqeusts weather a user may issue a post due to the post limit
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
  - `limits:may-vote`: Requests weather a user may issue or retract a vote on a meme
     - Worker: `MemeHub-Limits`
     - Request data:
       ```ts
       {
         user_id: string, // The id of the user in question
         meme_id: string // The id of the meme in question
       }
       ```
     - Response data:
       ```ts
       boolean // Weather the user may vote on the meme right now
       ```
  - `limits:quota`: Requests relevant information on posting limits
     - Worker: `MemeHub-Limits`
     - Request data:
       ```ts
       {
         user_id: string // The id of the user in question
       }
       ```
     - Reponse data:
       ```ts
       {
         tokens: number, // The amount of meme tokes the user has
         freePosts: number // The amount of posts a user may issue before having to pay with tokens
       }
       ```
  - `tokens:issue`: Alters the amount of tokens a user has
      - Worker: `MemeHub-Limits` (should be moved into own module)
      - Request data:
        ```ts
        {
          user_id: string, // The user in question
          amount: number // The amount of tokens to give (negative to take away tokens)
        }
        ```
      - Response data:
        ```ts
        number // The new amount of tokens the user has
        ```