const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const scenes = require('../../../data/scenes.json').categories;
const keyboard = require('../../../data/keyboard.json');

/**
 * This is the main scene of the contest stage where the user
 * is asked to choose an action.
 * @param {*} scenes
 */
module.exports.build = function (_) {

    const keyboarStart = new Keyboard()
        .add(keyboard.ADD, keyboard.LIST, keyboard.REMOVE)
        .add(keyboard.CREATE_MAPPING, keyboard.LIST_MAPPINGS, keyboard.DELETE_MAPPING)
        .add(keyboard.SET_MAXIMUM, keyboard.DONE)
        .draw();

    const scene = new Scene(scenes.MENU);
    scene.enter(async ctx => {
        if (ctx.session.isNotFirst)
            return ctx.reply("Is there anything else you want to do?", keyboarStart);

        await ctx.reply("Okay, let's manage the categories!");
        ctx.reply("What do you want to do?", keyboarStart);
        ctx.session.isNotFirst = true;
    });
    scene.hears(keyboard.ADD, ctx => ctx.scene.enter(scenes.CREATE));
    scene.hears(keyboard.REMOVE, ctx => ctx.scene.enter(scenes.DELETE));
    scene.hears(keyboard.LIST, ctx => ctx.scene.enter(scenes.LIST));
    scene.hears(keyboard.CREATE_MAPPING, ctx => ctx.scene.enter(scenes.CREATE_MAPPING_KEY));
    scene.hears(keyboard.LIST_MAPPINGS, ctx => ctx.scene.enter(scenes.LIST_MAPPINGS));
    scene.hears(keyboard.DELETE_MAPPING, ctx => ctx.scene.enter(scenes.DELETE_MAPPING));
    scene.hears(keyboard.SET_MAXIMUM, ctx => ctx.scene.enter(scenes.MAXIMUM));
    scene.hears(keyboard.DONE, async ctx => {
        ctx.session.isNotFirst = false;
        await ctx.reply("See you soon!", { reply_markup: { remove_keyboard: true } });
        ctx.scene.leave();
    });

    return scene;
}