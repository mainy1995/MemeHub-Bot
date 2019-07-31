const db = require('./mongo-db');
const config = require('./config');

async function check_post_archievements(ctx) {
    const result = await db.get_user_meme_count(ctx.message.from.id);
    const archievement = config.achievements.post_count.find(a => a.count === result);

    if (!archievement) return;

    ctx.telegram.sendMessage(config.group_id, archievement.message.replace("%USER%", `@${ctx.message.from.username}`));
}

async function check_vote_archievements(ctx) {

}

module.exports.check_post_archievements = check_post_archievements;