const _config = require('./config');
const _bot = require('./bot');
const util = require('./util');
const log = require('./log');

let config = {};
_config.subscribe('config', c => config = c);
_bot.subscribe(bot => {
    bot.start(send_welcome_message);
    bot.help(send_help_message);
    bot.on('new_chat_members', send_public_welcome_message);
});

async function send_public_welcome_message(ctx) {
    try {
        if (ctx.message.chat.id !== config.group_id)
            return;
        ctx.reply(
            config.public_welcome_message.replace("%USER%", util.name_from_user(ctx.message.new_chat_member)),
            {
                reply_markup: {
                    inline_keyboard: [[{ text: "Get Started", url: "tg:resolve?domain=mh_leif_bot&start=" }]]
                }
            }
        );

    }
    catch (error) {
        log.warning('Failed to send public welcome message.', error);
    }
}

async function send_welcome_message(ctx) {
    ctx.reply(config.welcome_message);
}

async function send_help_message(ctx) {
    ctx.reply(config.help_message);
}
