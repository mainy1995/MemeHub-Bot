const db = require('./sql-db');

function my_top(ctx) {
    let user_id = ctx.message.from.id;  
    db.get_user_top_meme(user_id)
        .then((data) => {
            ctx.reply(`media id: ${data.media_id} (${data.upvotes} upvotes)`);
        })
        .catch((err) => {
            ctx.reply("I'm broken 💩");
        });
}

function my_average(ctx) {
    let user_id = ctx.message.from.id;
    db.get_user_average_upvotes(user_id)
        .then((average) => {
            ctx.reply(`Your upvote average: ${average}`);
        })
        .catch((err) => {
            ctx.reply("I'm broken 💩");
        });
}

function user_overview(ctx) {
    db.get_user_meme_counts()
        .then(overview => {
            let reply = overview.keys().map(key, index => `${index}. ${key} with ${overview[key]} memes` ).join('\n');
            ctx.reply(reply);
        })
        .catch((err) => {
            ctx.reply("I'm broken 💩");
        });
}


module.exports.my_top = my_top;
module.exports.my_average = my_average;
module.exports.user_overview = user_overview;
