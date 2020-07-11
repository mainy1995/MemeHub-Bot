const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').categories;
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.CREATE);

    scene.enter(async ctx => await ctx.reply("Which category do you want do add?"));
    scene.on('message', async ctx => {
        try {
            const { created } = await clients.createCategory.request({ category: ctx.message.text, validate: true });

            if (!created)
                await ctx.reply("Sorry, that didn't work. Either you entered an invalid category or the category exists already.");

            await ctx.reply("Okay!");
        }
        catch (error) {
            await log.warn('Failed to create category', error);
            await ctx.reply("Sorry, somthing went wrong.");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}