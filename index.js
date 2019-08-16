const Telegraf = require('telegraf');

const db = require('./js/mongo-db');
const forward = require('./js/meme-forwarding');
const voting = require('./js/meme-voting');
const clearing = require('./js/meme-clearing');
const stats = require('./js/statistics');
const categoriesStage = require('./js/categories');
const welcome = require('./js/welcome-message');
const cron = require('node-cron');
const config = require('./config/config.json');

const bot = new Telegraf(config.bot_token);

db.init();

cron.schedule('0 * * * * *', () => {
    bot.telegram.sendMessage(config.group_id, "Hi there!");
});

categoriesStage.init(bot);

bot.start(({ reply }) => reply('Welcome to the Memehub bot!'));
bot.help(({ reply }) => reply('Just send me memes! You can add categories by adding a caption.'));
bot.on('new_chat_members', welcome.greet_new_user);
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

bot.launch();