const db = require('./mongo-db');
const log = require('./log');
const voting = require('./meme-voting');
const posting = require('./meme-posting');
const _config = require('./config');
const _bot = require('./bot');

let bot;
let group_id = undefined;
_config.subscribe('config', c => group_id = c.group_id);
_bot.subscribe(b => bot = b);

const awaiting_updates = {}; // Keeping track how many promises are queued to update a meme 

async function update_user_name(user) {
    var memes = db.get_memes_by_user(user.id, { projection: { group_message_id: 1, categories: 1, votes: 1 } });

    for await (const meme of memes) {
        const caption = posting.build_caption(user, meme.categories);
        const votes = await db.count_votes(meme._id);
        const keyboard = voting.create_keyboard(votes);
        bot.telegram.editMessageCaption(group_id, meme.group_message_id, null, caption, { reply_markup: { inline_keyboard: keyboard } })
            .catch(error => {
                log.error("Could not update meme caption after user name change", { error, meme });
            });
    }
}

/** 
 * Updates a meme group message to include an up to date caption and vote buttons.
 * A Message will only be updated after a delay, which will be extended if requested
 * to update again within this delay. 
 */
async function update_meme_in_group(meme_id) {
    if (meme_id in awaiting_updates) {
        awaiting_updates[meme_id] += 1;
    }
    else {
        awaiting_updates[meme_id] = 1;
    }

    setTimeout(() => try_update(meme_id), 1000);
}

function try_update(meme_id) {
    if (typeof awaiting_updates[meme_id] !== 'number') {
        log.error("Unexpected queue state while trying to update meme group message.");
        return;
    }

    awaiting_updates[meme_id] -= 1;
    if (awaiting_updates > 0)
        return;

    delete awaiting_updates[meme_id];
    do_update(meme_id);
}

async function do_update(meme_id) {
    try {
        const meme = await db.get_meme_by_id(meme_id);
        const caption = posting.build_caption(meme.user, meme.categories);
        const votes = await db.count_votes(meme._id);
        const keyboard = voting.create_keyboard(votes);

        await bot.telegram.editMessageCaption(group_id, meme.group_message_id, null, caption, { reply_markup: { inline_keyboard: keyboard } });
    }
    catch (error) {
        // This happends quite often, so we dont want to see the error message all the time.
        if (error.description === 'Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message') {
            log.info("Could not update meme group message", { problem: "Message not modified.", meme_id });
            return;
        }
        log.error("Could not update meme group message", { error, meme_id });
    }
}

module.exports.update_user_name = update_user_name;
module.exports.update_meme_in_group = update_meme_in_group;
