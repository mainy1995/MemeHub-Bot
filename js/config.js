const log = require('./log');
const watchr = require('watchr');
const fs = require('fs');
const lc = require('./lifecycle');

/** Mapping of config names to callback functions subscribed to this config */
const subscribers = {};
/** Mapping of config names to the current configs */
const configs = {};
let stalker = [];

/**
 * Subscribes to a config file.
 * @param config_name {The config_name of the config to subscribe to.}  
 * @param update_callback {The callback to execute, when the config has changed. This will also be executed upon subscribing or when the config has been first read.}  
 */
function subscribe(config_name, update_callback) {
    if (config_name in subscribers) {
        add_subscriber(config_name, update_callback);
        return;
    }

    subscribers[config_name] = [ update_callback ];
    init_config(config_name);
}

lc.on('stop', () => {
    for (s of stalker) {
        s.close();
    }
});

async function init_config(config_name) {
    read_config(config_name);

    let s = watchr.open(
        `config/${config_name}.json`, 
        (changeType) =>{
            if (changeType === 'delete') {
                log.error('Missing config file', `Config file "${config_name}" has been deleted`);
                return;
            }

            if (changeType === 'create') {
                log.warning('New config file', `Config file "${config_name}" has been created`);
                read_config(config_name);
                return;
            }

            if (changeType !== 'update') {
                log.error('Unknown config file update', `Config file "${config_name}" has been changed, but the update type "${changeType}" is unhandled. Skipping change.`);
                return;
            }

            log.info('Updated config file', `Config file "${config_name}" has been updated`);
            read_config(config_name);
        },
        (err) => {
            if (err) {
                log.error(`Cannot attch watchr to config "${config_name}"`, err);
                return;
            }
        });

    stalker.push(s);
}

function read_config(config_name) {
    fs.readFile(`config/${config_name}.json`, (err, data) => {
        if (err) {
            log.error(`Cannot read config file "${config_name}"`, err);
            return;
        }

        on_update(config_name, JSON.parse(data));
    });
}

function add_subscriber(config_name, update_callback) {
    subscribers[config_name].push(update_callback);
    if (configs[config_name]) update_callback(configs[config_name]);
}

function on_update(config_name, new_config) {
    configs[config_name] = new_config;
    notify_subscribers(config_name, new_config);
}

function notify_subscribers(config_name, config = null) {
    if (!config) config = configs[config_name];
    for(update_callback of subscribers[config_name]) {
        update_callback(config);
    }
}

module.exports.subscribe = subscribe;