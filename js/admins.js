const _config = require('./config');
const _bot = require('./bot');

let config = {};
let bot

_config.subscribe('config', c => config = c);
_bot.subscribe(b => bot = b);

async function getAdmins() {
    if (!bot) throw 'Bot not connected';
    return bot.telegram.getChatAdministrators(config.group_id);
}

async function can_delete_messages(user) {
    const admins = await getAdmins();
    return admins.some(a => a.user.id == user.id && (a.status == 'creator' || a.can_delete_messages));
}

async function can_change_info(user) {
    const admins = await getAdmins();
    return admins.some(a => a.user.id == user.id && (a.status == 'creator' || a.can_change_info));
}

async function is_admin(user) {
    const admins = await getAdmins();
    return admins.some(a => a.user.id == user.id);
}

module.exports.can_delete_messages = can_delete_messages;
module.exports.can_change_info = can_change_info;
module.exports.is_admin = is_admin;