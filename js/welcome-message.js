const config = require('../config.json');

async function greet_new_user(ctx) {
    try {
        for (const user of ctx.message.new_chat_members) {
            ctx.telegram.sendMessage(user.id, config.welcome_message);
        }
    }
    catch (err) {
        console.log(err);
    }
}
module.exports.greet_new_user = greet_new_user;