const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const { serializeError } = require('serialize-error');

const log = require('../../log');

/**
 * Scene to finsh the creation of a new contest
 * @param {*} scenes 
 * @param {*} keyboard 
 */
module.exports.build = function (scenes, keyboard, clients) {

    const keyboardYesNo = new Keyboard()
        .add(keyboard.YES, keyboard.NO)
        .draw();

    const scene = new Scene(scenes.CREATE_FINISH);
    scene.enter(async ctx => {
        await ctx.reply("Great! That's all I need.");
        await ctx.reply(`Here is a summary:\nID: ${ctx.session.id}\nTag: #${ctx.session.tag}\nEmoji: ${ctx.session.emoji}`);
        ctx.reply("Do you want to create this contest?", keyboardYesNo);
    });
    scene.hears(keyboard.NO, async ctx => {
        await ctx.reply('Okay, not using that');
        ctx.scene.enter(scenes.MENU);
    })
    scene.hears(keyboard.YES, async ctx => {
        try {
            await ctx.reply("Great! I'm creating your new contest now");
            const created = await clients.create.request({
                id: ctx.session.id,
                tag: ctx.session.tag,
                emoji: ctx.session.emoji
            });
            if (!created)
                throw new Error('Worker returned invalid response. Contest has not been created.');

            ctx.scene.enter(scenes.MENU);
        }
        catch (error) {
            await log.error('Failed to create new contest.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Sorry, something went wrong while creating your contest. See the logs for mor information.');
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}