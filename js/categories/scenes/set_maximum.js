const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const scenes = require('../../../data/scenes.json').categories;
const _keyboard = require('../../../data/keyboard.json');
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.MAXIMUM);

    scene.enter(async ctx => {
        try {
            const maximum = await clients.getOrSetMaximum.request();
            const keyboard = new Keyboard();
            keyboard.add(_keyboard.BACK);
            await ctx.reply(`The current maximum of categories a user may add is ${maximum}. Enter a new maximum to change it.`, keyboard.draw());
        }
        catch (error) {
            await log.warn('Failed to init change maximum', error);
            await ctx.reply("Sorry, somthing went wrong.");
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(_keyboard.BACK, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {

            const maximum = parseInt(ctx.message.text);
            if (!maximum)
                return await ctx.reply("Please enter a number");

            const newMaximum = await clients.getOrSetMaximum.request(maximum);
            await ctx.reply(`The maximum is now ${newMaximum}.`);
        }
        catch (error) {
            log.warning("Failed to set category maximum", error);
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    })

    return scene;
}