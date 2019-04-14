const { Composer, log, session } = require('micro-bot');
const db = require('./js/mongo-db');
const forward = require('./js/meme-forwarding');
const upvote = require('./js/meme-upvoting');
const stats = require('./js/statistics');

db.init('live');
forward.init();

let callback_handlers = {
    "upvote": upvote.handle_upvote_request
};

const bot = new Composer()
bot.use(log());
bot.use(session());

bot.start(({ reply }) => reply('Welcome to the Memehub bot!'));
bot.help(({ reply }) => reply('Just send me memes! You can add categories by adding a caption.'));

bot.on('photo', forward.handle_meme_request);
bot.on('animation', forward.handle_meme_request);
bot.on('video', forward.handle_meme_request);

bot.on('callback_query', (ctx) => {
    if (!ctx.update.callback_query.data in callback_handlers || ctx.update.callback_query.from.is_bot) {
        ctx.answerCbQuery();
        return;
    }

    callback_handlers[ctx.update.callback_query.data](ctx);
});

bot.command('top', stats.my_top); // zeigt mein Meme mit den meisten Upvotes an
bot.command('avg', stats.my_average); // zeigt durchschnittliche Upvotes auf meine Memes an
bot.command('meme_sum', stats.user_overview); // zeigt memer mit deren Anzahl an Uploads an

module.exports = bot