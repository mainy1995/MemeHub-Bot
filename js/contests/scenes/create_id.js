const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').contest;

/**
 * Scene to enter the id of a new contest.
 * @param {*} scenes 
 * @param {*} _ 
 */
module.exports.build = function (_) {

    const scene = new Scene(scenes.CREATE_ID);
    scene.enter(async ctx => {
        await ctx.reply("Okay, let's create a new contest", { reply_markup: { remove_keyboard: true } })
        ctx.reply("What id should the contest have? It's just there for you to recognize the contest. Please use only letters and numbers.");
    });
    scene.on('message', ctx => {
        const id = ctx.message.text;
        if (!/^[a-z0-9]+$/i.test(id) || id.length < 1)
            return ctx.reply('That is not a valid name, try again');

        ctx.session.id = id;
        ctx.scene.enter(scenes.CREATE_TAG);
    });

    return scene;
}