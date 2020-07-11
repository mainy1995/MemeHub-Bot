const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').categories;
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.LIST);

    scene.enter(async ctx => {
        try {
            const categories = await clients.listCategories.request();
            let text = `There are currently ${categories.length} categories:\n`;
            for (const category of categories)
                text += `\n${category}`;

            await ctx.reply(text);
        }
        catch (error) {
            await log.warn('Failed to list categories', error);
            await ctx.reply("Sorry, somthing went wrong.");
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });

    return scene;
}