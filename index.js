const Telegraf = require('telegraf');
const db = require('./js/mongo-db');
const forward = require('./js/meme-forwarding');
const voting = require('./js/meme-voting');
const clearing = require('./js/meme-clearing');
const stats = require('./js/statistics');
const categoriesStage = require('./js/categories');
const welcome = require('./js/welcome-message');
const config = require('./config/config.json');
const best_of = require('./js/best-of.js');
const util = require('./js/util.js');
const debug = require('./js/debug.js');

const bot = new Telegraf(config.bot_token);

db.init();
best_of.init(bot);
categoriesStage.init(bot);
debug.init(bot);
util.set_bot(bot);

bot.start(welcome.send_welcome_message);
bot.help(welcome.send_help_message);
bot.on('new_chat_members', welcome.send_public_welcome_message);
bot.on('photo', forward.handle_meme_request);
bot.on('animation', forward.handle_meme_request);
bot.on('video', forward.handle_meme_request);

bot.command('top', stats.my_top); // zeigt mein Meme mit den meisten Upvotes an
bot.command('avg', stats.my_average); // zeigt durchschnittliche Upvotes auf meine Memes an
bot.command('sum', stats.user_overview); // zeigt memer mit deren Anzahl an Uploads an
bot.command('repost',clearing.clear_repost); //löscht meme aus gruppe und markiert als repost

bot.on('callback_query', (ctx) => {
    if (voting.is_legacy_like_callback(ctx.update.callback_query)) {
        voting.handle_legacy_like_request(ctx);
        return;
    }

    if (!voting.is_vote_callback(ctx.update.callback_query) || ctx.update.callback_query.from.is_bot) {
        ctx.answerCbQuery();
        return;
    }
    voting.handle_vote_request(ctx);
});

bot.launch().then(() => {
    console.log('    \x1b[32m%s\x1b[0m', 'Bot launched');
}, (err) => {
    util.log_error("Cannot launch bot", err);
});