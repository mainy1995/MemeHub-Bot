const colors = {
    "ERROR":   "\x1b[31m",
    "WARNING": "\x1b[35m",
    "INFO":    "\x1b[34m",
    "SUCCESS": "\x1b[32m",
    "reset":   "\x1b[0m"
}

let config = {};
let log = {};

let bot;

/**
 * Sets the Telegraf object to use when sending messages without a context.
 * @param {The Telegraf object to use when sending messages without a context} _bot 
 */
function set_bot(_bot) {
    bot = _bot;
}

function set_config(_config) { 
    _config.subscribe('config', c => config = c);
    _config.subscribe('log', c => log = c);
}

/**
 * universal error logging. prints the error to the console, but also sends a message to every chat in the error_chats array of the config
 * @param {*} problem 
 * @param {*} error 
 */
function log_error(problem, error) {
    handle_log('ERROR', problem, error);
}

function log_warning(problem, data) {
    handle_log('WARNING', problem, data);
}

function log_info(info, data) {
    handle_log('INFO', info, data);
}

function log_success(text, data) {
    handle_log('SUCCESS', text, data);
}

function handle_log(level, text, data) {
    if (log.levels[level] && log.levels[level].console) print_log(level, text, data);
    if (log.levels[level] && log.levels[level].message) send_log_message(level, text, data);
}

function print_log(level, text, data) {
    if (level === 'SUCCESS') console.log(`${log.indentation.head}${colors.SUCCESS}${text}${colors.reset}`);
    else console.log(`${log.indentation.head}${colors[level]}${level}:${colors.reset} ${text}`);
    if (data) console.log(`${indented(readable(data))}`);
}


function send_log_message(level, text, data) {
    if (!config.log_chats) return;

    let message = `*${level}:* ${text}`;
    if (data) message = `${message}\n\`${readable(data)}\``;

    try {
        if (!bot) throw 'Telegraf bot object not set in util.js';
        for(id of config.log_chats) {
            bot.telegram.sendMessage(id, message, { parse_mode: 'Markdown'});
        }
    }
    catch(e) {
        print_log('ERROR', 'Failed sending log message', e);
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
module.exports.success = log_success;
module.exports.info = log_info;