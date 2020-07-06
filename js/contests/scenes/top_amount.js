const Scene = require('telegraf/scenes/base');
const { serializeError } = require('serialize-error');
const util = require('../../util');
const db = require('../../mongo-db');

const log = require('../../log');

/**
 * Scene to start a contest
 * @param {*} scenes 
 * @param {*} keyboard 
 * @param {*} clients 
 */
module.exports.build = function (scenes, keyboard, clients) {

    const scene = new Scene(scenes.TOP_AMOUNT);
    scene.enter(async ctx => {
        try {
            ctx.reply('How many results do you want?', { reply_markup: { remove_keyboard: true } });
        }
        catch (error) {
            log.warn('Contest scene "top_amount" failed.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong, sorry!');
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.on('message', async ctx => {
        try {

            const amount = parseInt(ctx.message.text);
            if (!amount || amount < 1)
                return ctx.reply('Please choose a number larger than 0');

            const memeIds = await clients.top.request({ id: ctx.session.id, vote_type: ctx.session.vote_type, amount });

            if (!memeIds || memeIds.length < 1)
                return await ctx.reply('There is no contest entry so far');

            if (memeIds.length < amount)
                await ctx.reply(`So far there are only ${memeIds.length} entries:`);

            let rank = 0;
            for (const id of memeIds) {
                rank++;
                const meme = await db.get_meme_by_id(id);
                const votes = meme.votes[ctx.session.vote_type];
                const extra = {
                    caption: `#${rank}: @${meme.user.username} - ${votes ? votes.length : 0} votes`
                };
                await util.send_media_by_type(ctx.telegram, ctx.chat.id, meme._id, meme.type, extra);
            }

        }
        catch (error) {
            log.warn('Contest scene "top_amount" failed.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong, sorry!');
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });
    return scene;
}