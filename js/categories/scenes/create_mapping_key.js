const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').categories;
const log = require('../../log');

module.exports.build = function build(clients) {

    const scene = new Scene(scenes.CREATE_MAPPING_KEY);

    scene.enter(async ctx => {
        await ctx.reply("What input do you want to map?", { reply_markup: { remove_keyboard: true } });
        ctx.session.categories = clients.listCategories.request();
    });
    scene.on('message', ctx => {
        ctx.session.key = ctx.message.text;
        ctx.scene.enter(scenes.CREATE_MAPPING_CATEGORY);
    });

    return scene;
}