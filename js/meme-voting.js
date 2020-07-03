const { Publisher, Client } = require('redis-request-broker');
const { serializeError } = require('serialize-error');
const util = require('./util');
const log = require('./log');
const db = require('./mongo-db');
const achievements = require('./achievements');
const _config = require('./config');
const _bot = require('./bot');
const lc = require('./lifecycle');

const vote_prefix = "vote"
let vote_types = [];
let publisherVote;
let publisherRetractVote;
let clientMayVote;

_config.subscribe('vote-types', c => { vote_types = c; });
_config.subscribe('rrb', async rrb => {
    await stop();

    publisherVote = new Publisher(rrb.events.vote);
    publisherRetractVote = new Publisher(rrb.events.retractVote);
    clientMayVote = new Client(rrb.queues.mayUserVote);
    await publisherVote.connect();
    await publisherRetractVote.connect();
    await clientMayVote.connect();
});

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

lc.on('stop', stop);
async function stop() {
    if (publisherVote)
        await publisherVote.disconnect();

    if (publisherRetractVote)
        await publisherRetractVote.disconnect();

    if (clientMayVote)
        await clientMayVote.disconnect();
}


/**
 * Saves the user, his upvote and updates the upvote count.
 * @param {The context of the callback_query} ctx 
 */
async function handle_vote_request(ctx) {
    const group_message_id = ctx.update.callback_query.message.message_id;
    const meme_id = util.any_media_id(ctx.update.callback_query.message);
    const user = ctx.update.callback_query.from;
    const user_id = user.id;
    const vote_type = vote_type_from_callback_data(ctx.update.callback_query.data);

    if (!vote_types.find(t => t.id == vote_type)) {
        log.warning("Cannot handle vote request", `Unknown vote type: "${vote_type}"`);
        ctx.answerCbQuery();
        return;
    }

    if (!group_message_id) {
        log.warn('Cannot handle vote request', { detail: 'could not identify message id', callback_query: ctx.update.callback_query });
        return ctx.answerCbQuery();
    }

    try {
        const mayVote = await clientMayVote.request({ user_id, meme_id });
        if (!mayVote) {
            log.info('Ignoring vote request as user has voted to much', { user_id, meme_id });
            return ctx.answerCbQuery();
        }
    }
    catch (error) {
        log.warn('Failed to check weather a user may vote. Ignoring vote request.', {
            error: serializeError(error),
            user,
            group_message_id,
            meme_id,
            vote_type
        });
        return ctx.answerCbQuery();
    }

    await db.connected;
    db.save_user(user);

    try {

        // Store the vote in the db
        const voteResult = await db.save_vote(user_id, group_message_id, vote_type)

        // Cancel if the vote has not changed
        if (!voteResult) return;

        // Queue achievement check
        setTimeout(() => achievements.check_vote_achievements(ctx, group_message_id, vote_type), 200);

        // Update vote count
        const new_count = await db.votes_count_by_group_message_id(group_message_id);
        ctx.editMessageReplyMarkup({ inline_keyboard: create_keyboard(new_count) })
            .catch(err => log.error('Cannot update vote count', err));

        // Send vote event to rrb
        const poster_id = await db.poster_id_get_by_group_message_id(group_message_id);
        const self_vote = await db.votes_includes_self_vote(group_message_id, vote_type, poster_id);

        const event = {
            vote_type,
            new_count: new_count[vote_type],
            meme_id,
            user_id,
            poster_id,
            self_vote
        };

        if (voteResult === 1)
            await publisherVote.publish(event);
        else if (voteResult === -1)
            await publisherRetractVote.publish(event);

    }
    catch (err) {
        log.error('Vote handling failed', serializeError(err));
    }
    finally {
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
