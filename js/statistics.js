const util = require('./util.js');
const log = require('./log.js');
const db = require('./mongo-db');

function my_top(ctx) {
    let user_id = ctx.message.from.id;  
    db.get_user_top_meme(user_id)
        .then((data) => {
            if (data == null) {
                ctx.reply("It looks like you did not send any memes yet 😱");
                return;
            }

            util.send_media_by_type(ctx, ctx.message.chat.id, data.media_id, data.type, {
                caption: `This is your top meme! It has ${data.upvotes} ${(data.upvotes == 1) ? 'upvote' : 'upvotes' }`
            });
        })
        .catch((err) => {
            log.error('getting statistics failed (my_top)', err);
            ctx.reply("I'm broken 💩");
        });
}

function my_average(ctx) {
    let user_id = ctx.message.from.id;
    db.get_user_average_upvotes(user_id)
        .then((average) => {
            ctx.reply(`Your posts get an average of ${parseFloat(average).toFixed(2)} upvotes!`);
        })
        .catch((err) => {
            log.error('getting statistics failed (my_average)', err);
            ctx.reply("I'm broken 💩");
        });
}

function user_overview(ctx) {
    db.get_user_meme_counts()
        .then(users => {
            let list = users.map((user, index) => `${index + 1}. ${util.name_from_user(user)} with ${user.memes} ${user.memes == 1 ? "meme" : "memes"}` ).join('\n');
            ctx.reply(`Here are the top posters:\n\n${list}`);
        }, (err) => {
            log.error('getting statistics failed (user_overview)', err);
            ctx.reply("I'm broken 💩");
        });
}

module.exports.my_top = my_top;
module.exports.my_average = my_average;
module.exports.user_overview = user_overview;
