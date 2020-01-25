const util = require('./util');
const log = require('./log');
const db = require('./mongo-db');
const achievements = require('./achievements');
const _config = require('./config');
const _bot = require('./bot');

const vote_prefix = "vote"
let vote_types = [];

_config.subscribe('vote-types', c => { vote_types = c; });

_bot.subscribe(bot => {
    bot.on('callback_query', (ctx) => {
        if (is_legacy_like_callback(ctx.update.callback_query)) {
            handle_legacy_like_request(ctx);
            return;
        }

        if (!is_vote_callback(ctx.update.callback_query) || ctx.update.callback_query.from.is_bot) {
            ctx.answerCbQuery();
            return;
        }
        handle_vote_request(ctx);
    });
});


/**
 * Saves the user, his upvote and updates the upvote count.
 * @param {The context of the callback_query} ctx 
 */
async function handle_vote_request(ctx) {
    const group_message_id = ctx.update.callback_query.message.message_id;
    const user = ctx.update.callback_query.from;
    const vote_type = vote_type_from_callback_data(ctx.update.callback_query.data);

    if (!vote_types.find(t => t.id == vote_type)) {
        log.warning("Cannot handle vote request", `Unknown vote type: "${vote_type}"`);
        ctx.answerCbQuery();
        return;
    }

    if (!group_message_id) {
        log.warn('Cannot handle vote request', { detail: 'could not identify message id', callback_query: ctx.update.callback_query });
        ctx.answerCbQuery();
        return;
    }

    await db.connected;
    db.save_user(ctx.update.callback_query.from);

    try {
        await db.save_vote(user.id, group_message_id, vote_type)

        setTimeout(() => achievements.check_vote_achievements(ctx, group_message_id, vote_type), 200);

        const votes = await db.votes_count_by_group_message_id(group_message_id);

        ctx.editMessageReplyMarkup({ inline_keyboard: create_keyboard(votes) })
            .catch(err => log.error('Cannot update vote count', err));
        ctx.answerCbQuery();
    }
    catch (err) {
        log.error('Vote handling failed', err);
        ctx.answerCbQuery();
    }

}

async function handle_legacy_like_request(ctx) {
    ctx.update.callback_query.data = "vote:like";
    return handle_vote_request(ctx);
}

function vote_type_from_callback_data(data) {
    return data.split(':', 2)[1];
}

function create_keyboard(votes) {
    let keyboard = []
    for (const type of vote_types) {
        keyboard.push({
            text: !!votes[type.id] ? `${type.emoji} - ${votes[type.id]}` : type.emoji,
            callback_data: `${vote_prefix}:${type.id}`
        });
    }
    return [keyboard];
}

function is_vote_callback(callback_query) {
    return callback_query.data.startsWith(`${vote_prefix}:`);
}

function is_legacy_like_callback(callback_query) {
    return callback_query.data == "upvote";
}



module.exports.handle_vote_request = handle_vote_request;
module.exports.handle_legacy_like_request = handle_legacy_like_request;
module.exports.create_keyboard = create_keyboard;
module.exports.is_vote_callback = is_vote_callback;
module.exports.is_legacy_like_callback = is_legacy_like_callback;
