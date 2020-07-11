const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const scenes = require('../../../data/scenes.json').categories;
const _keyboard = require('../../../data/keyboard.json');
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.CREATE_MAPPING_CATEGORY);

    scene.enter(async ctx => {
        const categories = await ctx.session.categories;
        const keyboard = new Keyboard();
        keyboard.add(_keyboard.CANCEL);
        for (const category of categories)
            keyboard.add(category);

        await ctx.reply("Okay, now select a category to map to", keyboard.draw());
    });
    scene.hears(_keyboard.CANCEL, ctx => ctx.scene.enter(scenes.MENU));
    scene.on('message', async ctx => {
        try {
            const { created } = await clients.categoriesCreateMapping.request({ category: ctx.message.text, key: ctx.session.key });

            if (!created)
                return await ctx.reply("Sorry, that didn't work. Either you entered an invalid category or the mapping exists already.");

            await ctx.reply("The mapping is now active!");
        }
        catch (error) {
            await log.warn('Failed to create category mapping', error);
            await ctx.reply("Sorry, somthing went wrong.");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}