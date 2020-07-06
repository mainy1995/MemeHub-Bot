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
  - `events:contest-created`: A new contest has been created
    ```ts
    {
      id: string, // The id of the contest
      tag: string, // The hashtag / category of the contest
      emoji: string, // The emoji of the contest
      running: boolean // True, if the contest is running
    }
    ```
  - `events:contest-deleted`: A contest has been deleted
    ```ts
    string // The id of the contest
    ```
  - `events:contest-started`: A contest has been started
    ```ts
    string // The id of the contest
    ```
  - `events:contest-stopped`: A contest has been stopped
    ```ts
    string // The id of the contest
    ```
  

## Requests

Request and response messaging (RPC)

### General

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

### Limits

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

### Tokens

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

### Contests

  - `contests:create`: Creates a new contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        {
          id: string, // The id / name of the contest. Used for managing it.
          tag: string, // The hastag that users choose when submitting for this contest
          emoji: string // A emoji that can make the contest stand out
        }
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been created
        ```
  - `contests:start`: Starts a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        string // The id / name of the contest to start
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been started
        ```
  - `contests:stop`: Stops a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        string // The id / name of the contest to stop
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been stopped
        ```
  - `contests:delete`: Deletes a contest
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        string // The id / name of the contest to delete
        ```
      - Response data:
        ```ts
        boolean // True, if the contest has been deleted
        ```
  - `contests:list`: Shows a list of existing contests
      - Worker: `MemeHub-Contests`
      - Request data:
        ```ts
        {
          onlyRunning: boolean // If true, only running contests will be returned
        }
        ```
      - Response data:
        ```ts
        {
          id: string, // The id of the contest
          tag: string, // The hashtag / category of the contest
          emoji: string, // The emoji of the contest
          running: boolean // True, if this contest is running
        }[]
        ```
  - `contest:top`: Shows the best contributions for a contest
      - Worker: `MemeHub-Contests`
      - Request data:
      ```ts
      {
        id: string, // The id of the contest
        vote_type: string, // The vote type that counts
        amount: number // The amount of memes to return
      }
      ``` 
      - Response data:
      ```ts
      string[] // a list of meme ids
      ```