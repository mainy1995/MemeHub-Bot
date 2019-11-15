const maintain = require('./meme-maintaining.js');
const db = require('./mongo-db.js');

function init(bot) {
    bot.command('chatinfo', reply_with_chat_id);
    bot.command('updateusername', trigger_update_user_name);
}

async function reply_with_chat_id(ctx) {
    console.log('\n === \x1b[35mCHAT INFO\x1b[0m ===');
    console.log(ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
    //ctx.reply(ctx.)
}

async function trigger_update_user_name(ctx) {
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

module.exports.init = init;