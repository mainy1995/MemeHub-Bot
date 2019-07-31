const db = require('./mongo-db');
const config = require('./config');

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
        const user = await db.get_user_from_meme(file_id);
        const upvotes = await db.count_user_total_votes_by_type(user, vote_type);
        if (!config.achievements.vote_count[vote_type]) return;

        const achievement = config.achievements.vote_count[vote_type].find(a => a.count === upvotes);

        if (!achievement) return;
        console.log(ctx);
        ctx.telegram.sendMessage(config.group_id, fromatMessage(achievement, ctx.update.callback_query.from));
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