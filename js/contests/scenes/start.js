const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const scenes = require('../../../data/scenes.json').contest;
const keyboard = require('../../../data/keyboard.json');
const { serializeError } = require('serialize-error');

const log = require('../../log');

/**
 * Scene to start a contest
 * @param {*} scenes 
 * @param {*} keyboard 
 * @param {*} clients 
 */
module.exports.build = function (clients) {

    const scene = new Scene(scenes.START);
    scene.enter(async ctx => {
        try {
            const contests = await clients.list.request({});
            if (!contests || !contests.length)
                return await ctx.reply("You don't have any contests right now!");

            const notRunning = contests.filter(c => !c.running);

            if (notRunning.length < 1)
                return await ctx.reply("There is no contest that is not running!");

            const keyboardContests = new Keyboard();
            for (contest of notRunning) {
                keyboardContests.add(contest.id);
            }
            keyboardContests.add(keyboard.CANCEL);
            ctx.reply('Okay! Which contest do you want to start?', keyboardContests.draw());
        }
        catch (error) {
            log.warn('Contest scene "start" failed.', { error: serializeError(error), session: ctx.session });
            await ctx.reply('Something went wrong, sorry!');
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {
            const started = await clients.start.request(ctx.message.text);
            if (!started)
                throw new Error('Contest has not been started.');

            await ctx.reply('Done!');
            await ctx.reply("TODO show some more info here");
        }
        catch (error) {
            log.warning('Failed to start contest', { error: serializeError(error), contest: ctx.message.text });
            await ctx.reply("Sorry, I can't start that contest right now");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });
    return scene;
}