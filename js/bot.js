const Telegraf = require('telegraf');
const _config = require('./config');
const log = require('./log');
const dockerNames = require('docker-names');
const ShutdownHandler = require("node-shutdown-events");
new ShutdownHandler({ exitTimeout: 50000 });

const subscribers = [];
let bot;
let bot_name;
let has_bot = false;
_config.subscribe('config', async config => {
    if (has_bot) {
        has_bot = false;
        log.warning(`Stopping bot ${bot_name}`, 'Config has changed');
        bot.stop(() => start_bot(config));
        return;
    }

    start_bot(config);
});

function start_bot(config) {
    bot = new Telegraf(config.bot_token);
    bot_name = dockerNames.getRandomName();
    bot.catch(handle_error);
    log.set_bot(bot);
    log.set_config(_config);

    bot.launch().then(() => {
        log.success(`Bot launched: ${bot_name}`);
        has_bot = true;
        notify_subscribers(bot);
    }, (err) => {
        log.error(`Cannot launch bot: ${bot_name}`, err);
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

function handle_error(error, context) {
    log.error("Uncaught error", { error, context});
}

process.on("shutdown", async () => {
    if (!has_bot) return;

    log.warning(`Stopping bot ${bot_name}`, 'Shutdown event received');
    return bot.stop();
});


module.exports.subscribe = subscribe;