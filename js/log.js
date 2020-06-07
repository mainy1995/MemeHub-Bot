const { Publisher } = require('redis-request-broker');

const levels = {
    error: 'error',
    warning: 'warning',
    notice: 'notice',
    info: 'info',
    debug: 'debug'
}

let setReady;
let publisher;
let instance = 'unknown';
const isReady = new Promise(resolve => setReady = resolve);

function set_config(_config) {
    _config.subscribe('rrb', async rrb => {

        const channel = rrb.queues.logging || 'log';

        if (publisher && publisher.disconnect)
            await publisher.disconnect();

        publisher = new Publisher(channel);
        await publisher.connect();
        setReady();
    });
}

function set_name(name) {
    instance = name;
}

async function log_error(problem, error) {
    await handle_log(levels.error, problem, error);
}

async function log_warning(problem, data) {
    await handle_log(levels.warning, problem, data);
}

async function log_notice(text, data) {
    await handle_log(levels.notice, text, data);
}

async function log_info(info, data) {
    await handle_log(levels.info, info, data);
}

async function log_debug(text, data) {
    await handle_log(levels.debug, text, data);
}

async function handle_log(level, title, data) {
    await send_log(level, 'Bot', instance, title, data);
}

async function send_log(level, component, i, title, data) {
    await isReady;
    try {
        const message = { level, component, instance: i, title, data }
        await publisher.publish(message);
    }
    catch (error) {
        console.error('failed to publish log', error);
    }
}

module.exports.set_config = set_config;
module.exports.set_name = set_name;

module.exports.error = log_error;
module.exports.warning = log_warning;
module.exports.warn = log_warning;
module.exports.success = log_notice;
module.exports.notice = log_notice;
module.exports.info = log_info;
module.exports.debug = log_debug;
