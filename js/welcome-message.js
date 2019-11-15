const config = require('../config/config.json');
const util = require('util.js');

async function greet_new_user(ctx) {
    ctx.reply(
        config.public_welcome_message.replace("%USER%", util.name_from_user(ctx.message.new_chat_member)),
        {
            reply_markup: {
                inline_keyboard: [[{ text: "Get Started", url: "https://www.t.me/mh_leif_bot?start=" }]]
            }
        }
    );
}
module.exports.greet_new_user = greet_new_user;