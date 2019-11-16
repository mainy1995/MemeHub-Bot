const _config = require('./config.js');


let config = {};
let c = {
    log: {}
}
_config.subscribe('config', new_config => {
    config = new_config;
});
_config.register('log', c);

const colors = {
    ERROR:   '\x1b[31m',
    WARNING: '\x1b[45m',
    INFO:    '\x1b[34m',
    SUCCESS: '\x1b[32m',
    reset:   '\x1b[0m'
};

const indentation = {
    head: '  ',
    data: '   ] ',
    data_inner: '  '
};

let bot;

/**
 * Sets the Telegraf object to use when sending messages without a context.
 * @param {The Telegraf object to use when sending messages without a context} _bot 
 */
function init(_bot) {
    bot = _bot;
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
    if (c.log[level] && c.log[level].console) print_log(level, text, data);
    if (c.log[level] && c.log[level].message) send_log_message(level, text, data);
}

function print_log(level, text, data) {
    if (level === 'SUCCESS') console.log(`${indentation.head}${colors.SUCCESS}${text}${colors.reset}`);
    else console.log(`${indentation.head}${colors[level]}${level}:${colors.reset} ${text}`);
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
    return JSON.stringify(data, null, indentation.data_inner);
}

function indented(json_string) {
    return `${indentation.data}${json_string.replace(/(?:\r\n|\r|\n)/g, `\n${indentation.data}`)}`;
}

module.exports.init = init;
module.exports.error = log_error;
module.exports.warning = log_warning;
module.exports.success = log_success;
module.exports.info = log_info;