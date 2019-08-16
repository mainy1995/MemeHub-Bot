const best_of = require("../config/best-of.json");
const config = require("../config/config.json");
const cron = require('node-cron');
let bot;

function init(_bot) {
    if (!best_of.enabled) return;

    bot = _bot;
    for (task of best_of.recent_best) {
        cron.schedule(task.cron_schedule, () => send_recent_best(task));
    }
}

function send_recent_best(task) {
    bot.telegram.sendMessage(config.group_id, "BEST OF TASK: ");
    bot.telegram.sendMessage(config.group_id, JSON.stringify(task));
    
}

module.exports.init = init;