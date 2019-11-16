const db = require('./mongo-db');
const log = require('./log');
const _config = require('./config');

let config = {};
let achievements = {};
_config.subscribe('config', c => config = c);
_config.subscribe('achievements', c => achievements = c);

let recent_vote_achievements = {};

async function check_post_archievements(ctx) {
    try {
        const result = await db.get_user_meme_count(ctx.message.from.id);
        const achievement = achievements.post_count.find(a => a.count === result);

        if (!achievement) return;

        ctx.telegram.sendMessage(config.group_id, fromatMessage(achievement, ctx.message.from));
    }
    catch (err) {
        log.error("Checking post achievements failed", err);
    }
}

async function check_vote_achievements(ctx, file_id, vote_type) {
    try {
        const poster_id = await db.get_user_from_meme(file_id);
        const votes = await db.count_user_total_votes_by_type(poster_id, vote_type);
        if (!achievements.vote_count[vote_type]) return;

        const achievement = achievements.vote_count[vote_type].find(a => a.count === votes);

        if (!achievement) return;

        const poster = await db.get_user(poster_id);

        if (recent_vote_achievements[`${poster._id}:${vote_type}`] == votes) return;

        ctx.telegram.sendMessage(config.group_id, fromatMessage(achievement, poster));
        recent_vote_achievements[`${poster._id}:${vote_type}`] = votes;
    }
    catch (err) {
        log.error("Checking upvote achievements failed", err);
    }
}

function fromatMessage(achievement, user) {
    return achievement.message.replace("%USER%", `@${user.username}`).replace("%COUNT%", achievement.count);
}

module.exports.check_post_archievements = check_post_archievements;
module.exports.check_vote_achievements = check_vote_achievements;