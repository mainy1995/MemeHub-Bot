const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const scenes = require('../../../data/scenes.json').categories;
const _keyboard = require('../../../data/keyboard.json');
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.COLUMNS);

    scene.enter(async ctx => {
        try {
            const columns = await clients.getOrSetColumns.request();
            const keyboard = new Keyboard();
            keyboard.add(_keyboard.BACK);
            await ctx.reply(`I currently put ${columns} categories in one row. Enter a new amount to change it.`, keyboard.draw());
        }
        catch (error) {
            await log.warn('Failed to init change columns', error);
            await ctx.reply("Sorry, somthing went wrong.");
            ctx.scene.enter(scenes.MENU);
        }
    });
    scene.hears(_keyboard.BACK, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {

            const columns = parseInt(ctx.message.text);
            if (!columns)
                return await ctx.reply("Please enter a number");

            const newColumns = await clients.getOrSetColumns.request(columns);
            await ctx.reply(`The new amount of columns is ${newColumns}.`);
        }
        catch (error) {
            log.warning("Failed to set category columns", error);
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    })

    return scene;
}