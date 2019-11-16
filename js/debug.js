const maintain = require('./meme-maintaining.js');
const db = require('./mongo-db.js');
//const config = require('./config.js');
const debug_config = require('../config/debug.json');
/*
let debug_config = {};
config.subscribe('debug', (new_config) => {
    console.log('new config');
    console.log(new_config);
    debug_config = new_config;
});*/

function init(bot) {
    console.log("init");
    bot.use(log_all_updates);
    bot.command('chatinfo', reply_with_chatinfo);
    bot.command('updateusername', trigger_update_user_name);
}

async function reply_with_chatinfo(ctx) {
    console.log('chat info');
    console.log(debug_config);
    if (!debug_config.command_chatinfo) return;
    console.log('\n === \x1b[35mCHAT INFO\x1b[0m ===');
    console.log(ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
}

async function trigger_update_user_name(ctx) {
    if (!debug_config.command_update_username) return;
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

async function log_all_updates(ctx) {
    if (!debug_config.log_all_updates) return;
    console.log('\n === \x1b[33m%s\x1b[0m ===', 'INCOMING UPDATE');
    console.log(ctx.update);
    console.log('\n');
}

module.exports.init = init;