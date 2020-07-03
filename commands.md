# Commands

The bot supports multiple commands. Some of them are restricted by admin rights set in the group and / or the chat which the command has ben sent in. Some commands have to be sent as a reply to a meme.

| Command                                    | Arguments         | rights                | private | group |
|--------------------------------------------|-------------------|-----------------------|---------|-------|
| [`/tokens`](#tokens)                       |                   |                       | yes     | no    |
| [`/issue`](#issue)                         | `username amount` | `can_change_info`     | yes     | no    |
| [`/remove`](#remove)                       | `[reason]`        | `can_delete_messages` | yes     | yes   |
| [`/repost`](#repost)                       | `[reason]`        | `can_delete_messages` | yes     | yes   |
| [`/edit_categories`](#edit_categories)     |                   |                       | yes     | no    |
| [`/set_categories`](#set_categories)       | `[categories]`    |                       | yes     | yes   |
| [`/add_categories`](#add_categories)       | `[categories]`    |                       | yes     | yes   |
| [`/remove_categories`](#remove_categories) | `[categories]`    |                       | yes     | yes   |
| [`/top`](#top)                             |                   |                       | yes     | yes   |
| [`/avg`](#avg)                             |                   |                       | yes     | yes   |
| [`/sum`](#sum)                             |                   |                       | yes     | yes   |
| [`/chatinfo`](#chatinfo)                   |                   |                       | yes     | yes   |
| [`/updateusername`](#updateusername)       |                   |                       | yes     | yes   |
| [`/meme`](#meme)                           | `meme_id`         | `is_admin`            | yes     | yes   |

## `/tokens`

Shows your currnet amount of meme tokens and remaining free posts.

## `/issue`

Issues a user meme tokens or takes some away, when the amount if negative. Users will receive a message about the change.

## `/remove`

Removes a meme from the group chat and marks it as removed in the db. If a reason is provided, it will be stored as well.

If the command is sent as a response to a meme, this meme will be removed. Otherwise the last one posted in the group will be removed.

## `/repost`

Same as `/remove`, but the reason is set to `"repost"` per default and the repost flag will be set to true in the database.

## `/edit_categories`

Shows the category keyboard to the user. Has to be sent as a reply to a meme.

## `/set_categories`

Sets the categories of a meme directly. Each category should be separated with a whitespace. Has to be sent as a reply to a meme.

## `/add_categories`

Same as `/set_categories`, but keeps the existing categories.

## `/remove_categories`

Removes categories from a meme. Same synthax as `/set_categories`. Has to be sent as a reply to a meme.

## `/top`

Shows your meme with the most amount of `like` votes.

## `/avg`

Shows your average amount of `like` votes on all your memes.

## `/sum`

Shows a list of the users who posted to most amount of memes.

## `/chatinfo`

Shows information about the chat in which the command has been sent.

Can be disabled in `debug.json`.

## `/updateusername`

Triggers the update of the username for all your memes.

Can be disabled in `debug.json`.

## `/meme`

Shows a meme by its id.

Can be disabled in `debug.json`.