const Telegraf = require('telegraf');
const _config = require('./config');
const log = require('./log');
const dockerNames = require('docker-names');
const lc = require('./lifecycle');
const fs = require('fs');

const subscribers = [];
let bot;
let bot_name;
let has_bot = false;
let config;
_config.subscribe('config', async c => {
    if (has_bot) {
        has_bot = false;
        log.warning(`Stopping bot ${bot_name}`, 'Config has changed');
        await bot.stop();
    }
    config = c;
});

lc.after('init', async () => {
    lc.trigger('start');
})

lc.early('start', async () => {
    bot = new Telegraf(config.bot_token);
    bot_name = dockerNames.getRandomName();
    bot.catch(handle_error);
    log.set_bot(bot);
    log.set_config(_config);
});

lc.after('start', async () => {
    await bot.launch()
    log.success(`Bot launched: ${bot_name}`);
    has_bot = true;
    notify_subscribers(bot);
});

lc.on('stop', async () => {
    if (!has_bot) return;
    await log.notice(`Stopping bot ${bot_name}`, 'Shutdown event received');
    await bot.stop();
});

lc.after('stop', async () => {
    await log.info(`Shutdown complete for bot ${bot_name}`);
    process.exitCode = 0;
});

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
    try {
        log.error("Uncaught error", { error, context});
    }
    catch (err) {
        const text = `Critical Error: Failed logging an unahandled error!
            Original Error: ${error}
            Original Context: ${context}
            Logging Error: ${err}
        `;
        
        console.log(text);
        fs.writeFileSync("critical_error.txt", text);
    }
}

setTimeout(async () => { lc.trigger('init'); }, 1000);

module.exports.subscribe = subscribe;