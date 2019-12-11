const maintain = require('./meme-maintaining');
const db = require('./mongo-db');
const log = require('./log');
const _config = require('./config');
const _bot = require('./bot');
const lc = require('./lifecycle');

let config = {};
_config.subscribe('debug', c => config = c);
_bot.subscribe(bot => {
    bot.use(log_all_updates);
    bot.command('chatinfo', reply_with_chatinfo);
    bot.command('updateusername', trigger_update_user_name);
});

lc.hook(async (stage, event) => {
    if (!config.log_lifecycle_events) return;
    log.info(`Lifecycle ${stage}:${event}`);
});


async function reply_with_chatinfo(ctx) {
    if (!config.command_chatinfo) return;
    log.info('Chat info', ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
}

async function trigger_update_user_name(ctx) {
    if (!config.command_update_username) return;
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

async function log_all_updates(ctx, next) {
    if (!config.log_all_updates) {
        next();
        return;
    }

    log.info('Incoming update', ctx.update);
    next();
}