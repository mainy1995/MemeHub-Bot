function init(bot) {
    bot.command('chatinfo', reply_with_chat_id)
}

async function reply_with_chat_id(ctx) {
    console.log('\n === \x1b[35mCHAT INFO\x1b[0m ===');
    console.log(ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
    //ctx.reply(ctx.)
}

module.exports.init = init;