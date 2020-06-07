const db = require('./mongo-db');
const log = require('./log');
const _config = require('./config');

let config = {};
let achievements = {};
_config.subscribe('config', c => config = c);
_config.subscribe('achievements', c => achievements = c);

let recent_vote_achievements = {};

async function check_post_archievements(user) {
    try {
        const result = await db.get_user_meme_count(user.id);
        const achievement = achievements.post_count.find(a => a.count === result);

        if (!achievement) return;

        ctx.telegram.sendMessage(config.group_id, fromatMessage(achievement, user));
    }
    catch (err) {
        log.error("Checking post achievements failed", err);
    }
}

/**
 * Checks weather a user got an achievement. If that is the case, it will send a message into the group.
 */
module.exports.check_vote_achievements = async function check_vote_achievements(ctx, group_message_id, vote_type) {
    try {
        const poster_id = await db.poster_id_get_by_group_message_id(group_message_id);
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