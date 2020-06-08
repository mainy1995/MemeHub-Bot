const { serializeError } = require('serialize-error');

const db = require('./mongo-db');
const log = require('./log');
const admins = require('./admins');
const { last } = require('./meme-posting');
const _bot = require('./bot');

_bot.subscribe(bot => {
    bot.command('repost', clear_repost);
    bot.command('remove', remove_post);
});

/**
 * Deletes Repost and Command Message
 * @param {The telegraph message context} ctx 
 */
async function clear_repost(ctx) {
    await remove_post(ctx, 'repost', true);
}

async function remove_post(ctx, reason = undefined, repost = false) {
    try {
        // Get the message from the reply or use the last postet meme
        let message_id = ctx.update.message.reply_to_message && ctx.update.message.reply_to_message.message_id || last;
        if (!message_id)
            throw new Error('Found no message to remove');

        // Check if the user may delete post
        if (!admins.can_delete_messages(ctx.update.message.from))
            throw new Error('User is not allowed to remove posts')

        // Check if there is a reason
        if (ctx.state.command.args)
            reason = ctx.state.command.args;

        await ctx.deleteMessage(message_id);
        await db.meme_mark_as_removed(message_id, reason, repost || reason === 'repost');

        // Queue notify user
        setTimeout(async () => {
            try {
                const poster = await db.poster_id_get_by_group_message_id(meme_id);
                const text = reason
                    ? `One of your memes has been removed because of the following reason: ${reason}.`
                    : 'One of your memes has been removed by an admin.';

                ctx.telegram.sendMessage(poster, text);
            }
            catch (error) {
                log.warning('Failed to notify user about meme removal', serializeError(error));
            }
        }, 500);
        return message_id;
    }
    catch (error) {
        log.warning("Failed to remove post. The bot might need to have the 'can_delete_messages' privilege.", serializeError(error));
    }
    finally {
        ctx.deleteMessage(ctx.update.message.message_id);
    }
}
