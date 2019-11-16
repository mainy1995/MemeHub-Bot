const _config = require("./config");
const log = require('./log');
const cron = require('node-cron');

let group_id = undefined
_config.subscribe('config', c => group_id = c.group_id);
_config.subscribe('best-of', init);

let bot;
let tasks = [];

function set_bot(_bot) {
    bot = _bot;
}

function init(best_of) {
    destroy_all();
    if (!best_of || !best_of.enabled) return;

    schedule_all(best_of);
}

function schedule_all(best_of) {
    for (task of best_of.recent_best) {
        cron.schedule(task.cron_schedule, () => send_recent_best(task));
    }
}

function destroy_all() {
    for (task of tasks) {
        task.destroy();
    }
    tasks = [];
}

function send_recent_best(task) {
    if (!bot) {
        log.error('Cannot run scheduled best-of', 'bot telegraf object not set in "best-of.js"');
        return;
    }
    bot.telegram.sendMessage(group_id, "BEST OF TASK: ");
    bot.telegram.sendMessage(group_id, JSON.stringify(task));
}

module.exports.set_bot = set_bot;