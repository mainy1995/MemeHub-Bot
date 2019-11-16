const Telegraf = require('telegraf');
const _config = require('./config');
const log = require('./log');

const subscribers = [];
let bot;
let has_bot = false;
_config.subscribe('config', async config => {
    if (has_bot) {
        has_bot = false;
        log.warning('Stopping bot', 'Config has changed');
        bot.stop(() => start_bot(config));
        return;
    }

    start_bot(config);
});

function start_bot(config) {
    bot = new Telegraf(config.bot_token);
    log.set_bot(bot);
    log.set_config(_config);

    bot.launch().then(() => {
        log.success('Bot launched');
        has_bot = true;
        notify_subscribers(bot);
    }, (err) => {
        log.error("Cannot launch bot", err);
    });
}

function subscribe(callback) {
    subscribers.push(callback);
    if (has_bot) callback(bot);
}

function notify_subscribers(bot) {
    for (callback of subscribers) {
        callback(bot);
    }
}

module.exports.subscribe = subscribe;