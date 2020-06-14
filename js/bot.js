const Telegraf = require('telegraf');
const dockerNames = require('docker-names');
const commandParts = require('telegraf-command-parts');
const { serializeError } = require('serialize-error');
const { Defaults, Worker } = require('redis-request-broker');

const _config = require('./config');
const log = require('./log');
const lc = require('./lifecycle');
const fs = require('fs');
const moment = require('moment');

const subscribers = [];
let getBotTokenWorker = undefined;
let bot;
let bot_name;
let has_bot = false;
let config;
let rrbConfig;
_config.subscribe('config', async c => {
    if (has_bot) {
        has_bot = false;
        log.warning(`Stopping bot ${bot_name}`, 'Config has changed');
        await bot.stop();
    }
    config = c;
});

_config.subscribe('rrb', async rrb => {
    Defaults.setDefaults({
        redis: rrb.redis
    });
    rrbConfig = rrb;
})

lc.early('init', async () => {
    bot_name = dockerNames.getRandomName();
    log.set_name(bot_name);
});

lc.after('init', async () => {
    lc.trigger('start');
})

lc.early('start', async () => {
    bot = new Telegraf(config.bot_token);
    getBotTokenWorker = new Worker(rrbConfig.queues.getBotToken, async _ => config.bot_token);
    getBotTokenWorker.listen().catch(error => log.warning('Failed to start get bot token worker', error));
    log.set_config(_config);
    bot.use(commandParts());
    bot.catch(handle_error);
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

lc.on('stop', async () => {
    getBotTokenWorker.stop().catch(console.error);
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
${JSON.stringify(context, null, 2)}

Error Stack:
${error.stack}

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