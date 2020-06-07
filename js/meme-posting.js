const { Publisher } = require('redis-request-broker');
const { serializeError } = require('serialize-error');

const util = require('./util');
const log = require('./log');
const _config = require('./config');
const db = require('./mongo-db');
const lc = require('./lifecycle');
const achievements = require('./achievements');
const voting = require('./meme-voting');
const _bot = require('./bot');

let group_id = undefined;
let eventPost;
let telegram;
let last = undefined;

_bot.subscribe(b => telegram = b.telegram);
_config.subscribe('config', c => group_id = c.group_id);
_config.subscribe('rrb', async rrb => {
    await stop();
    eventPost = new Publisher(rrb.events.post);
    await eventPost.connect();
});

lc.on('stop', stop);
async function stop() {
    if (eventPost) await eventPost.disconnect();
}

/**
 * Sends a meme to the meme group.
 * By setting the group_message_id fied in the db, the meme counts as posted.
 * @param {string} meme_id The id of the meme
 * @returns {*} A void promise
 */
async function post_meme(meme_id) {
    // Get latest meme data
    const meme = await db.get_meme_by_id(meme_id);

    // Check weather we can post this meme
    if (!meme)
        throw new Error('Cannot post meme: Meme not found.');

    if (meme.group_message_id)
        throw new Error('Cannot post meme: Already posted.');

    try {
        // Build caption and keyboard
        const extra = {
            caption: build_caption(meme.user, meme.categories),
            reply_markup: {
                inline_keyboard: voting.create_keyboard(meme.votes)
            }
        }

        // Send the meme to the chat
        telegram.sendMessage(meme.poster_id, "Sending you meme ✈️");
        const result = await util.send_media_by_type(telegram, group_id, meme._id, meme.type, extra);

        // Store the group message id, which marks the meme as posted
        await db.save_meme_group_message(meme_id, result.message_id);
        last = result.message_id;

        // Trigger achievements check
        setTimeout(() => achievements.check_post_archievements(meme.user), 100);

        // Send event to mq
        eventPost.publish({ meme_id, poster_id: meme.poster_id })
            .catch(error => log.warning('Failed to publish post event', { error: serializeError(error), options }));
    }
    catch (error) {
        log.warning("Cannot not post meme:", serializeError(error));
        telegram.sendMessage(meme.poster_id, `Something went wrong while posting 😥`);
    }
}

function build_caption(user, categories) {
    let caption = `@${user.username}`
    if (categories && categories.length > 0)
        caption += ` | ${categories.map(c => `#${c}`).join(' · ')}`;

    return caption;
}

module.exports.post_meme = post_meme;
module.exports.build_caption = build_caption;
module.exports.last = last;
