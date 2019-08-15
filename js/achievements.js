const db = require('./mongo-db');
const config = require('../config.json');

async function check_post_archievements(ctx) {
    try {
        const result = await db.get_user_meme_count(ctx.message.from.id);
        const achievement = config.achievements.post_count.find(a => a.count === result);

        if (!achievement) return;

        ctx.telegram.sendMessage(config.group_id, fromatMessage(achievement, ctx.message.from));
    }
    catch (err) {
        console.log("ERROR: Checking post achievements failed");
    }
}

async function check_vote_achievements(ctx, file_id, vote_type) {
    try {
        const poster_id = await db.get_user_from_meme(file_id);
        const upvotes = await db.count_user_total_votes_by_type(poster_id, vote_type);
        if (!config.achievements.vote_count[vote_type]) return;

        const achievement = config.achievements.vote_count[vote_type].find(a => a.count === upvotes);

        if (!achievement) return;

        const poster = await db.get_user(poster_id);
        ctx.telegram.sendMessage(config.group_id, fromatMessage(achievement, poster));
    }
    catch (err) {
        console.log("ERROR: Checking upvote achievements failed:");
        console.log(err);
    }
}

function fromatMessage(achievement, user) {
    return achievement.message.replace("%USER%", `@${user.username}`).replace("%COUNT%", achievement.count);
}

module.exports.check_post_archievements = check_post_archievements;
module.exports.check_vote_achievements = check_vote_achievements;