const { Client } = require('redis-request-broker');
const { serializeError } = require('serialize-error');

const util = require('./util');
const log = require('./log');
const db = require('./mongo-db');
const lc = require('./lifecycle');
const _bot = require('./bot');
const _config = require('./config');

let clientGetQuota;
_config.subscribe('rrb', async rrb => {
    await stop();
    clientGetQuota = new Client(rrb.queues.getUserQuota);
    await clientGetQuota.connect();
});

_bot.subscribe(bot => {
    bot.command('top', my_top); // zeigt mein Meme mit den meisten Upvotes an
    bot.command('avg', my_average); // zeigt durchschnittliche Upvotes auf meine Memes an
    bot.command('sum', user_overview); // zeigt memer mit deren Anzahl an Uploads an
    bot.command('tokens', show_quota)
});

lc.on('stop', stop);
async function stop() {
    if (clientGetQuota)
        await clientGetQuota.disconnect();
}

function my_top(ctx) {
    let user_id = ctx.message.from.id;
    db.get_user_top_meme(user_id)
        .then((data) => {
            if (data == null) {
                ctx.reply("It looks like you did not send any memes yet 😱");
                return;
            }

            util.send_media_by_type(ctx.telegram, ctx.message.chat.id, data.media_id, data.type, {
                caption: `This is your top meme! It has ${data.upvotes} ${(data.upvotes == 1) ? 'upvote' : 'upvotes'}`
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
            let list = users.map((user, index) => `${index + 1}. ${util.name_from_user(user)} with ${user.memes} ${user.memes == 1 ? "meme" : "memes"}`).join('\n');
            ctx.reply(`Here are the top posters:\n\n${list}`);
        }, (err) => {
            log.error('getting statistics failed (user_overview)', err);
            ctx.reply("I'm broken 💩");
        });
}

async function show_quota(ctx) {
    const user_id = ctx.message.from.id;

    if (!util.is_private_chat(ctx)) {
        ctx.deleteMessage(ctx.message.id);
        return;
    }

    try {
        const quota = await clientGetQuota.request({ user_id });
        ctx.reply(`Here are all your tokens:\nDaily: ${quota.time}\nReward: ${quota.reward}`);
    }
    catch (error) {
        log.warning('Failed to handle quota request', { error: serializeError(error), user_id });
        ctx.reply("Sorry, I can't help you right now.");
    }
}

module.exports.my_top = my_top;
module.exports.my_average = my_average;
module.exports.user_overview = user_overview;
