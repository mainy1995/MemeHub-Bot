const maintain = require('./meme-maintaining.js');
const debug_config = require('../config/debug.json');
const db = require('./mongo-db.js');

function init(bot) {
    if (debug_configbot.log_all_updates) bot.use(log_all_updates);
    if (debug_config.command_chatinfo) bot.command('chatinfo', reply_with_chat_id);
    if (debug_config.command_update_username) bot.command('updateusername', trigger_update_user_name);
}

async function reply_with_chat_id(ctx) {
    console.log('\n === \x1b[35mCHAT INFO\x1b[0m ===');
    console.log(ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
}

async function trigger_update_user_name(ctx) {
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

async function log_all_updates(ctx) {
    console.log('\n === \x1b[33m%s\x1b[0m ===', 'INCOMING UPDATE');
    console.log(ctx.update);
    console.log('\n');
}

module.exports.init = init;