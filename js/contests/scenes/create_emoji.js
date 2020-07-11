const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').contest;

/**
 * Scene to enter the emoji of a new contest
 * @param {*} scenes 
 * @param {*} _ 
 */
module.exports.build = function (_) {

    const scene = new Scene(scenes.CREATE_EMOJI);
    scene.enter(ctx => ctx.reply('Finally, choose an emoji for the contest'));
    scene.on('message', ctx => {
        // Testing for emojis is messy, we just check the length of the string.
        // Other charactes don't look nice, but that's not our problem.
        const emoji = ctx.message.text;
        if (emoji.length < 1 || emoji.length > 2)
            return ctx.reply(`That does not look like an emoji. Try again!`);

        ctx.session.emoji = emoji;
        ctx.scene.enter(scenes.CREATE_FINISH);
    });
    return scene;
}