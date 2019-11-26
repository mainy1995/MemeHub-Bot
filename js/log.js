const fs = require('fs');
const moment = require('moment');

const levels = {
    error: 0,
    warning: 1,
    notice: 2,
    info: 3,
    debug: 4
}

const colors = {
    0: "\x1b[31m",
    1: "\x1b[35m",
    2: "\x1b[32m",
    3: "\x1b[34m",
    4: "\x1b[37m",
    "reset": "\x1b[0m"
}

const names = {
    0: "ERROR",
    1: "WARNING",
    2: "Notice",
    3: "Info",
    4: "Debug"
}

let config = {};
let log = {};
let setReady;
let bot;
const file_streams = {};
const isReady = new Promise(resolve => setReady = resolve);

/**
 * Sets the Telegraf object to use when sending messages without a context.
 * @param {The Telegraf object to use when sending messages without a context} _bot 
 */
function set_bot(_bot) {
    bot = _bot;
}

function set_config(_config) { 
    _config.subscribe('config', c => config = c);
    _config.subscribe('log', async c => {
        log = c;
        await ensure_log_file_dir();
        setReady();
    });
}

/**
 * universal error logging. prints the error to the console, but also sends a message to every chat in the error_chats array of the config
 * @param {*} problem 
 * @param {*} error 
 */
function log_error(problem, error) {
    handle_log(levels.error, problem, error);
}

function log_warning(problem, data) {
    handle_log(levels.warning, problem, data);
}

function log_notice(text, data) {
    handle_log(levels.notice, text, data);
}

function log_info(info, data) {
    handle_log(levels.info, info, data);
}

function log_debug(text, data) {
    handle_log(levels.debug, text, data);
}

async function handle_log(level, text, data) {
    const timestamp = moment().format(log.timestamp.format);
    await isReady;
    if (doesLog(log.console, level)) print_log(level, text, data, timestamp);
    if (doesLog(log.telegram, level)) send_log_message(level, text, data, timestamp);
    if (doesLog(log.file, level)) write_log(level, text, data, timestamp);
}

function doesLog(config, level) {
    if (!config || !config.enabled) return false;
    return level <= levels[config.level || info];
}

function print_log(level, text, data, timestamp) {
    if (level === levels.notice) console.log(`${timestamp}${log.indentation.head}${colors[level]}${text}${colors.reset}`);
    else console.log(`${timestamp}${log.indentation.head}${colors[level]}${names[level]}:${colors.reset} ${text}`);
    if (data) console.log(`${indented(readable(data))}`);
}

function send_log_message(level, text, data, timestamp) {
    if (!log.telegram.chats) return;

    let message = `_${timestamp}_\n*${names[level]}:* ${text}`;
    if (data) message = `${message}\n\`${readable(data)}\``;

    try {
        if (!bot) throw 'Telegraf bot object not set in util.js';
        for(id of log.telegram.chats) {
            bot.telegram.sendMessage(id, message, { parse_mode: 'Markdown'});
        }
    }
    catch(e) {
        print_log(levels.error, 'Failed sending log message', e);
    }
}

function write_log(level, text, data, timestamp = '') {
    try {
        const file_path = `${log.file.path}/${moment().format(log.file.format)}.${log.file.extension}`;
        let message = `${timestamp}${log.indentation.head}${names[level]}: ${text}\n`;
        if (data) message = `${message}${indented(readable(data))}\n`;
        append_to_file(file_path, message);
    }
    catch (e) {
        print_log(levels.error, 'Failed writing to log file', e);
    }
}

async function append_to_file(file, text) {
    if (!file_streams[file]) {
        close_all_files();
        file_streams[file] = await fs.createWriteStream(file, {flags: 'a'});
    }
    file_streams[file].write(text);
}

function close_all_files() {
    for (file in file_streams) {
        file_streams[file].end();
    }
}

function ensure_log_file_dir() {
    if (!log.file || !log.file.path) return;
    const dir = log.file.path;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

function readable(data) {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, log.indentation.data_inner);
}

function indented(json_string) {
    return `${log.indentation.data}${json_string.replace(/(?:\r\n|\r|\n)/g, `\n${log.indentation.data}`)}`;
}

module.exports.set_bot = set_bot;
module.exports.set_config = set_config;
module.exports.error = log_error;
module.exports.warning = log_warning;
module.exports.success = log_notice;
module.exports.notice = log_notice;
module.exports.info = log_info;
module.exports.debug = log_debug;