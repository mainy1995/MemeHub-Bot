const { Stage, Scene } = require('micro-bot');
const Keyboard = require('telegraf-keyboard');
const forward = require('./meme-forwarding');
const util = require('./util');

let categories = [ 'Category 1', 'Category 2', 'Nr3' ];
categories = categories.map(c => "#" + util.escape_category(c));
const keyboard = new Keyboard();
keyboard.add([...categories, 'No category']);

const mediaCache = [];

function init(bot) {
    const selectCategory = new Scene('selectCategory');
    selectCategory.enter(start);
    selectCategory.leave(end);
    selectCategory.hears('No category', noCategory);
    selectCategory.on('message', receive);

    const stage = new Stage();
    stage.register(selectCategory);
    bot.use(stage);
}

function ask(ctx, data) {
    mediaCache[data.user.id] = data; 
    ctx.scene.enter('selectCategory');
}
function start(ctx) {
    ctx.reply("Pick a category or type one in 👇", keyboard.draw());
}

function receive(ctx) {
    const category = util.escape_category(ctx.message.text);
    if (!category) {
        ctx.reply("That is 🚫not🚫 a valid category 🖕");
        return;
    }
    
    const data = mediaCache[ctx.message.from.id];
    if (!data) {
        ctx.reply("💣 I messed up 💣");
    }
    else {
        data.category = category;
    }
    trigger_process(ctx);
}

function end(ctx) {

}

function noCategory(ctx) {
    trigger_process(ctx);
}

function trigger_process(ctx) {
    const user = ctx.message.from;
    const data = mediaCache[user.id];
    mediaCache[user.id] = null;
    if (!data) {
        ctx.reply('Look like you did not send me a meme yet 😭');
        return;
    }
    forward.process_meme(ctx, data);
    ctx.scene.leave();
}

module.exports.init = init;
module.exports.ask = ask;