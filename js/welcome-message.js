const config = require('../config/config.json');
const util = require('./util.js');

async function send_public_welcome_message(ctx) {
    ctx.reply(
        config.public_welcome_message.replace("%USER%", util.name_from_user(ctx.message.new_chat_member)),
        {
            reply_markup: {
                //inline_keyboard: [[{ text: "Get Started", url: "https://www.t.me/mh_leif_bot?start=" }]]
                inline_keyboard: [[{ text: "Get Started", url: "tg:resolve?domain=mh_leif_bot&start=" }]]
            }
        }
    );
}

async function send_welcome_message(ctx) {
    ctx.reply(config.welcome_message);
}

async function send_help_message(ctx) {
    ctx.reply(config.help_message);
}

module.exports.send_public_welcome_message = send_public_welcome_message;
module.exports.send_welcome_message = send_welcome_message;
module.exports.send_help_message = send_help_message;