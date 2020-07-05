const categories = require('../../categories');
const Scene = require('telegraf/scenes/base');

/**
 * Scene to enter the hashtag of a new contest
 * @param {*} scenes 
 * @param {*} _ 
 */
module.exports.build = function (scenes, _, _) {

    const scene = new Scene(scenes.CREATE_TAG);
    scene.enter(ctx => ctx.reply('What hashtag do you want to use?'));
    scene.on('message', async ctx => {
        const tag = categories.escape_category(ctx.message.text);
        if (!tag)
            return ctx.reply('That is not a valid hastag. Try again:');

        ctx.session.tag = tag;
        await ctx.reply(`Okay, using #${tag}`);
        ctx.scene.enter(scenes.CREATE_EMOJI);
    });

    return scene;
}