const _config = require('./config');

let config = {};
_config.subscribe('config', c => config = c);

let bot

async function init(_bot) {
    bot = _bot;    
}

async function getAdmins() {
    return bot.telegram.getChatAdministrators(config.group_id);
}

async function can_delete_messages(user) {
    const admins = await getAdmins();
    return admins.some(a => a.user.id == user.id && (a.status == 'creator' || a.can_delete_messages));
}

module.exports.init = init;
module.exports.can_delete_messages = can_delete_messages;