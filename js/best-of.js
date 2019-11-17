const _config = require("./config");
const _bot = require('./bot');
const moment = require('moment');
const db = require('./mongo-db');
const log = require('./log');
const cron = require('cron');
const util = require('./util');


let bot;
let channel_id = undefined
let tasks = [];
let vote_types = [ ];

_bot.subscribe(b => bot = b);
_config.subscribe('vote-types', v => vote_types = v);
_config.subscribe('best-of', best_of => {
    stop_all();
    if (!best_of || !best_of.enabled) return;
    channel_id = best_of.channel_id;
    schedule_all(best_of);
});

function schedule_all(best_of) {
    tasks = best_of.recent_best.map(t => cron.job(t.cron_schedule, () => send_recent_best(t), null, true));
}

function stop_all() {
    for (task of tasks) {
        task.stop();
    }
    tasks = [];
}

async function send_recent_best(task) {
    if (!bot) {
        log.error('Cannot run scheduled best-of', 'Bot not running');
        return;
    }
    log.info('Running best-of task', task);

    const meme = await db.get_meme_recent_best(
        task.vote_type,
        moment().subtract(task.age_maximum).toDate(),
        moment().subtract(task.age_minimum).toDate()
    );

    if (meme == null) {
        log.warning('Not running scheduled best-of', { reason: 'no meme matchtes the requirements', task});
        return;
    }

    let vote_string = Object.keys(meme.votes).map(k => `${meme.votes[k].length}x${vote_types.find(v => v.id == k).emoji}`).join(' ');
    let user = util.name_from_user(meme.user);
    util.send_media_by_type(bot, channel_id, meme.media_id, meme.type, { caption: `${task.caption} ${user} | ${vote_string}` });
}