const db = require('./mongo-db');
const log = require('./log');
const voting = require('./meme-voting');
const forwarding = require('./meme-forwarding');
const _config = require('./config');
const _bot = require('./bot');

let bot;
let group_id = undefined;
_config.subscribe('config', c => group_id = c.group_id);
_bot.subscribe(b => bot = b);

async function update_user_name(user) {
    var memes = db.get_memes_by_user(user.id, { projection: { group_message_id: 1, categories: 1, votes: 1 } });

    for await (const meme of memes) {
        const caption = forwarding.build_caption(user, meme.categories);
        const votes = await db.count_votes(meme._id);
        const keyboard = voting.create_keyboard(votes);
        bot.telegram.editMessageCaption(group_id, meme.group_message_id, null, caption, { reply_markup: { inline_keyboard: keyboard } })
            .catch(error => {
                log.error("Could not update meme caption after user name change", { error, meme });
            });
    }
}

module.exports.update_user_name = update_user_name;
