const listeners = { early: {}, on: {}, late: {}, after: {} };
const hooks = [async (stage, event) => {
    await Promise.all((listeners[stage][event] || []).map(async listener => {
        try {
            await listener();
        }
        catch (err) {
            console.log("Failed calling lifecycle listener!");
            console.log(err);
        }
    }));
}];

function register(stage, event, callback) {
    if (!listeners[stage][event]) listeners[stage][event] = [];
    listeners[stage][event].push(callback);
}

async function trigger(event) {
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

process.on("SIGINT", () => trigger('stop'));
process.on("SIGTERM", () => trigger('stop'));
process.on("SIGQUIT", () => trigger('stop'));
register('after', 'stop', () => process.exit(0));

module.exports.trigger = trigger;

module.exports.early = function (event, callback) {
    register('early', event, callback);
}

module.exports.on = function (event, callback) {
    register('on', event, callback);
}

module.exports.late = function (event, callback) {
    register('late', event, callback);
}

module.exports.after = function (event, callback) {
    register('after', event, callback);
}

module.exports.hook = function (callback) {
    hooks.unshift(callback);
}