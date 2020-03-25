const Telegraf = require('telegraf');
const _config = require('./config');
const log = require('./log');
const dockerNames = require('docker-names');
const lc = require('./lifecycle');
const fs = require('fs');
const commandParts = require('telegraf-command-parts');
const { serializeError } = require('serialize-error');
const moment = require('moment');

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
    bot.use(commandParts());
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

lc.early('stop', async () => {
    if (!has_bot) return;
    await log.notice(`Stopping bot ${bot_name}`, 'Shutdown event received');
    await bot.stop(() => { });
});

lc.late('stop', async () => {
    await log.notice(`Shutdown complete for bot ${bot_name}`);
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
    const stack = new Error().stack;
    const text = `
Critical Error: An error has not been caught. Bot shutting down!
==============

Time:
${moment().format('HH:mm:ss.SSS')}

Original Error:
${JSON.stringify(serializeError(error), null, 2)}

Original Context:
${JSON.stringify(context), null, 2}

Local Stack: 
${stack}
    `;
    console.log(text);
    fs.writeFileSync(`critical_error_${Math.floor(Date.now() / 1000)}`, text);
    process.exit(1);
}

process.on('uncaughtException', (exception, origin) => {
    handle_error(exception, origin);
});
process.on('unhandledRejection', (reason, promise) => {
    handle_error(reason, promise);
});

setTimeout(async () => { lc.trigger('init'); }, 1000);

module.exports.subscribe = subscribe;