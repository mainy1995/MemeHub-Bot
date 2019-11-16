const db = require('./mongo-db');
const log = require('./log');
const voting = require('./meme-voting');
const forwarding = require('./meme-forwarding');
const _config = require('./config');

let bot;
let group_id = undefined;
_config.subscribe('config', c => group_id = c.group_id);


function set_bot(_bot) {
    bot = _bot;
}

async function update_user_name(user) {
    var memes = db.get_memes_by_user(user.id, { projection: { group_message_id: 1, category: 1, votes: 1 }});
    for await (const meme of memes) {
        const caption = forwarding.build_caption(user, meme.category);
        const keyboard = voting.create_keyboard(meme.votes);
        bot.telegram.editMessageCaption(group_id, meme.group_message_id, null, caption, { reply_markup: { inline_keyboard: keyboard}})
            .catch(err => {
                log.error("Could not update meme caption after user name change", err);
            });
    }
}

module.exports.update_user_name = update_user_name;
module.exports.set_bot = set_bot;