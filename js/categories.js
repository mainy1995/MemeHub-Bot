const _bot = require('./bot');


const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const Session = require('telegraf/session');
const Keyboard = require('telegraf-keyboard');
const util = require('./util');
const log = require('./log');
const _config = require('./config');

let keyboard = new Keyboard();
let stage = new Stage();
const promises = [];

init();
_config.subscribe('categories', categories => {
    let category_options = categories.options;
    category_options = category_options.map(c => "#" + util.escape_category(c));
    category_options.push('No category');
    const chunk_size = categories.keyboard_width;
    keyboard = new Keyboard();
    for (let i = 0; i < category_options.length; i += chunk_size) {
        keyboard.add(category_options.slice(i, i + chunk_size));
    }
});
_bot.subscribe(bot => { // Has to be done before require forwarding
    bot.use(Session());
    bot.use(stage.middleware());
});

function init() {
    const selectCategory = new Scene('selectCategory');
    selectCategory.enter(start);
    selectCategory.leave(end);
    selectCategory.hears('No category', noCategory);
    selectCategory.on('message', receive);
    stage.register(selectCategory);
}

async function ask(ctx) {
    try {    
        ctx.scene.enter('selectCategory');
        return new Promise((resolve, reject) => promises[ctx.message.from.id] = { resolve, reject });
    }
    catch (error) {
        return Promise.reject(error);
    }
}

function start(ctx) {
    ctx.reply("Pick a category or type one in 👇", keyboard.draw());
}

function receive(ctx) {
    const category = util.escape_category(ctx.message.text);
    if (!category) {
        ctx.reply("That is 🚫not🚫 a valid category 🖕");
        promises[ctx.message.from.id].reject('Invalid category provided');
        return;
    }
    finish(ctx, category);
}

function end(ctx) {
    ctx.reply("Thanks!", { reply_markup: { remove_keyboard: true }});
}

function noCategory(ctx) {
    finish(ctx);
}

function finish(ctx, category) {
    if (!ctx.message.from.id in promises) {
        ctx.reply('Look like you did not send me a meme yet 😭');
        log.warning('Selecting category failed', 'No continuation promise presen');
        return;
    }

    promises[ctx.message.from.id].resolve(category);
    delete promises[ctx.message.from.id];
    ctx.scene.leave();
}

module.exports.ask = ask;