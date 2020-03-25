const db = require('./mongo-db');
const log = require('./log');
const admins = require('./admins');
const _bot = require('./bot');

_bot.subscribe(bot => bot.command('repost', clear_repost));

/**
 * Checks Message if its from Admin and if it contains Repost
 * @param {The telegraph message context} ctx 
 */
async function is_clearing_request(ctx) {
    if (ctx.update.message.text != '/repost') return false;
    if (ctx.update.message.reply_to_message == null) return false;
    if (!await admins.can_delete_messages(ctx.update.message.from)) return false;

    return true;
}
/**
 * Deletes Repost and Command Message
 * @param {The telegraph message context} ctx 
 */
async function clear_repost(ctx) {
    try {
        if (await is_clearing_request(ctx)) {
            var repost_msg_id = ctx.update.message.reply_to_message.message_id;
            var answer_msg_id = ctx.update.message.message_id;
            db.save_repost(repost_msg_id);
            await ctx.deleteMessage(repost_msg_id);
            await ctx.deleteMessage(answer_msg_id);
        }
    }
    catch (err) {
        log.error("Failed to clear repost message or repost command. The bot might need to have the 'can_delete_messages' privilege.", err);
    }
}


module.exports.clear_repost = clear_repost;
module.exports.is_clearing_request = is_clearing_request;