const util = require('./util');
const db = require('./mongo-db');

/**
 * Saves the user, his upvote and updates the upvote count.
 * @param {The context of the callback_query} ctx 
 */
async function handle_weeb_request(ctx) {
    let file_id = util.any_media_id(ctx.update.callback_query.message);
    let user = ctx.update.callback_query.from;

    await db.connected;
    db.save_user(ctx.update.callback_query.from);
    db.save_upweeb(user.id, file_id)
        .then(() => {
            Promise.all([db.count_upvotes(file_id), db.count_upweebs(file_id)])
                .then(data => {
                    ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: `👍 - ${data[0]}`, callback_data: "upvote" }, {text: `🤬 - ${data[1]}`, callback_data: "upweeb"}]] })
                        .catch(err => console.log(`ERROR: Could not update vote count (${err})`));
                    ctx.answerCbQuery();
                }, (err) => {
                    console.log(`ERROR: counting failed (${err})`);
                    ctx.answerCbQuery();
                });
        }, () => ctx.answerCbQuery());
    
}

module.exports.handle_upweeb_request = handle_weeb_request;