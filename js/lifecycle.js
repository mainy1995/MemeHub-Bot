const ShutdownHandler = require("node-shutdown-events");
new ShutdownHandler({ exitTimeout: 60000, log: { warn: () => {}, error: () => {}, info: () => {}} });

const listeners = { early: {}, on: {}, late: {}, after: {}};
const hooks = [async (stage, event) => {
    for(const listener of listeners[stage][event] || []) {
        try {
            await listener();
        }
        catch (err) {
            console.log("Failed calling lifecycle listener!");
            console.log(err);
        }
        
    }
}];

function register(stage, event, callback) {
    if (!listeners[stage][event]) listeners[stage][event] = [];
    listeners[stage][event].push(callback);
}

process.on("shutdown", async () => {
    await this.trigger('stop');
});

module.exports.trigger = async function(event) {
    try {
        for (const stage of ['early', 'on', 'late', 'after']) {
            for (const hook of hooks) {
                await hook(stage, event);
            }
        }
    }
    catch (err) {
        console.log(err);
    }
}

module.exports.early = function(event, callback) {
    register('early', event, callback);
}

module.exports.on = function(event, callback) {
    register('on', event, callback);
}

module.exports.late = function(event, callback) {
    register('late', event, callback);
}

module.exports.after = function(event, callback) {
    register('after', event, callback);
}

module.exports.hook = function(callback) {
    hooks.unshift(callback);
}