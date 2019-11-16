const maintain = require('./meme-maintaining.js');
const db = require('./mongo-db.js');
const util = require('./util.js');
const config = require('./config.js');

let debug_config = {};
config.subscribe('debug', (new_config) => {
    debug_config = new_config;
});

function init(bot) {
    bot.use(log_all_updates);
    bot.command('chatinfo', reply_with_chatinfo);
    bot.command('updateusername', trigger_update_user_name);
}

async function reply_with_chatinfo(ctx) {
    if (!debug_config.command_chatinfo) return;
    util.log_info('Chat info', ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
}

async function trigger_update_user_name(ctx) {
    if (!debug_config.command_update_username) return;
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

async function log_all_updates(ctx, next) {
    if (!debug_config.log_all_updates) {
        next()
        return;
    }

    util.log_info('Incoming update', ctx.update);
    next();
}

module.exports.init = init;