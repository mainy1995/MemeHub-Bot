const _bot = require('./bot');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const Session = require('telegraf/session');
const Keyboard = require('telegraf-keyboard');
const util = require('./util');
const log = require('./log');
const _config = require('./config');
const db = require('./mongo-db');
const maintain = require('./meme-maintaining');
const admins = require('./admins');

let categories = [];
let keyboard_width = 4;
let maximum = 1;
let stage = new Stage();

const emoji_ok = '✅';
const emoji_no = '❌';

init();
_config.subscribe('categories', c => {
    categories = c.options.map(escape_category);
    keyboard_width = c.keyboard_width;
    maximum = c.maximum;
});
_bot.subscribe(bot => { // Has to be done before require forwarding
    bot.use(Session());
    bot.use(stage.middleware());
    bot.command('edit_categories', command_edit_categories);
    bot.command('set_categories', command_set_categories);
    bot.command('add_categories', command_add_categories);
    bot.command('remove_categories', command_remove_categories);
});

function init() {
    const selectCategory = new Scene('selectCategory');
    selectCategory.enter(start);
    selectCategory.leave(cleanUp);
    selectCategory.hears(emoji_ok, done);
    selectCategory.hears(emoji_no, abort);
    selectCategory.on('message', receive);
    stage.register(selectCategory);
}

/**
 * Edits the categories of a meme.
 * @param {The current telegraf context} ctx
 */
async function edit_categories(ctx, meme_id) {
    try {
        const selected = await db.get_meme_categories(meme_id);
        ctx.session.categories = { meme_id, selected };
        ctx.scene.enter('selectCategory');
    }
    catch (error) {
        log.error("Failed initializing category edit scene", error);
        ctx.reply("💥 I somehow cannot do that right now, sorry!");
        try {
            ctx.scene.leave();
        }
        catch (error) { /* might happen when scene has not yet been entered */ }
    }
}

async function command_edit_categories(ctx) {
    try {
        // Ignore command in group
        if (!util.is_private_chat(ctx)) {
            await ctx.deleteMessage(ctx.update.message.message_id);
            return;
        }

        if (!util.is_reaction(ctx)) {
            await ctx.reply('Please only use this command in a reply to one of your memes.');
            return;
        }

        const meme_id = await db.meme_id_get_by_private_message_id(ctx.update.message.reply_to_message.message_id);
        if (!meme_id) {
            ctx.reply('This does not look like a meme to me 🤖');
            return;
        }

        await edit_categories(ctx, meme_id);
    }
    catch (error) {
        log.error("Cannot handle edit command", error);
        ctx.reply("💥 I somehow cannot do that right now, sorry!")
    }
}

async function command_set_categories(ctx) {
    try {
        const id = await get_meme_id_from_command(ctx);
        if (!id) {
            log.info('Abotring /set_categories command', 'No media id found or user is not permitted to edit the categories.');
            return;
        }

        const categories = parse_categories(ctx.update.message.text, 1);
        if (categories.length > maximum) {
            if (util.is_private_chat(ctx)) ctx.reply(`That's more than the ${maximum} allowed categories.`);
            log.info('Aborting /set_categories', 'maximum number of categories exceeded');
            return;
        }
        await db.save_meme_categories(id, categories);
        await maintain.update_meme_in_group(id);
        if (util.is_private_chat(ctx)) ctx.reply(`${emoji_ok} Done`);
    }
    catch (error) {
        log.error("Cannot handle command /set_categories", error);
    }
}

async function command_add_categories(ctx) {
    try {
        const id = await get_meme_id_from_command(ctx);
        if (!id) {
            log.info('Abotring /add_categories command', 'No media id found or user is not permitted to edit the categories.');
            return;
        }

        const categories = parse_categories(ctx.update.message.text, 1);
        if (categories.length < 1) {
            log.info('Ignoring /add_categories command', 'No categories to add given.');
            return;
        }
        const categories_in_db = await db.get_meme_categories(id);
        for (const category of categories)
            if (!categories_in_db.includes(category))
                categories_in_db.push(category);

        if (categories_in_db.length > maximum) {
            if (util.is_private_chat(ctx)) ctx.reply(`That would be more than the ${maximum} allowed categories.`);
            log.info('Aborting /add_categories', 'maximum number of categories exceeded');
            return;
        }

        await db.meme_add_categories(id, categories);
        await maintain.update_meme_in_group(id);
        if (util.is_private_chat(ctx)) ctx.reply(`${emoji_ok} Done`)
    }
    catch (error) {
        log.error("Cannot handle command /add_categories", error);
    }
}

async function command_remove_categories(ctx) {
    try {
        const id = await get_meme_id_from_command(ctx);
        if (!id) {
            log.info('Abotring /remove_categories command', 'No media id found or user is not permitted to edit the categories.');
            return;
        }

        const categories = parse_categories(ctx.update.message.text, 1);
        if (categories.length < 1) {
            log.info('Ignoring /remove_categories command', 'No categories to remove given.');
            return;
        }
        await db.meme_remove_categores(id, categories);
        await maintain.update_meme_in_group(id);
        if (util.is_private_chat(ctx)) ctx.reply(`${emoji_ok} Done`)
    }
    catch (error) {
        log.error("Cannot handle command /remove_categories", error);
    }
}


/**
 * Checks if a category command is in the group or in private chat or invalid  (if is reply and user is allowed to).
 * If the message is send in a group, it will be deleted.
 * @returns 'group', 'private' or null.
 * @param {*} ctx
 */
async function check_command(ctx) {
    const is_private = util.is_private_chat(ctx);
    // delete rquest, if is in group chat
    if (!is_private)
        await ctx.deleteMessage(ctx.update.message.message_id);

    // Check for reply
    if (!util.is_reaction(ctx)) {
        if (is_private)
            await ctx.reply('Please only use this command in a reply to a meme.');

        log.info('Aborting categories command', 'command was not in a reply to an other message.');
        return null;
    }

    // Check for media
    if (!util.has_any_media(ctx.update.message.reply_to_message)) {
        if (is_private)
            await ctx.reply('Please only use this command in a reply to a meme.');

        log.info('Aborting categories command', 'command was not in a reply to a message with media.');
        return null;
    }

    // Check if is allowed
    if (!can_edit(ctx)) {
        if (is_private)
            ctx.reply('You are not allowed to change categories for this meme.');

        log.info('Aborting categories command', 'user was not allowed to edit the categories of the meme.');
        return null;
    }

    return is_private ? 'private' : 'group'; // TODO maybe chat if it's actually a group message
}

/**
 * Validates a categoy request (if is reply and is allowed to) and returns the meme id of the meme in question.
 * If the message is send in a group, it will be deleted.
 * @param {*} ctx
 */
async function get_meme_id_from_command(ctx) {
    const type = await check_command(ctx);
    if (type === 'private')
        return await db.meme_id_get_by_private_message_id(ctx.update.message.reply_to_message.message_id);

    if (type === 'group')
        return await db.meme_id_get_by_group_message_id(ctx.update.message.reply_to_message.message_id);

    throw "Cannot get meme id from command";
}

/**
 * Checks, weather this is a category request where the user is allowed to change to categories.
 * As there is no 'can edit messages' admin right, we use 'can delete messages'.
 * @param {The cantext of the category request} ctx
 */
function can_edit(ctx) {
    return ctx.update.message.from.id === ctx.update.message.reply_to_message.message_id
        || admins.can_delete_messages(ctx.update.message.from);
}

function start(ctx) {
    ctx.reply("Pick a category or type one in 👇", buildCategoryKeyboard(ctx));
}

function receive(ctx) {
    try {
        const categories = parse_categories(ctx.message.text);
        // Check if is valid category
        if (categories.length < 1) {
            ctx.reply("That is 🚫not🚫 a valid category. Try again 👇", buildCategoryKeyboard(ctx));
            return;
        }

        // Add or remove from session
        for (const category of categories) {
            const index = ctx.session.categories.selected.indexOf(category);
            if (index > -1) {
                ctx.session.categories.selected.splice(index, 1);
                ctx.reply(`🗑️ Removing #${category}`, buildCategoryKeyboard(ctx));
            }
            else {
                ctx.session.categories.selected.push(category);
                ctx.reply(`✨ Adding #${category}`, buildCategoryKeyboard(ctx));
            }
        }

        if (ctx.session.categories.selected.length > maximum) {
            ctx.reply(`❗ That's more than the maximum of ${maximum} categories. Remove some before finishing.`);
        }
    }
    catch (error) {
        log.error("Cannot handle provided category", error);
        ctx.scene.leave();
    }
}

async function done(ctx) {
    if (ctx.session.categories.selected.length > maximum) {
        ctx.reply(`🚨🚨🚨 That's more categories than allowed! 🚨🚨🚨\nPlease remove some until you have ${maximum} or less categories.`);
        return;
    }

    try {
        await db.save_meme_categories(ctx.session.categories.meme_id, ctx.session.categories.selected);
        await maintain.update_meme_in_group(ctx.session.categories.meme_id);
        ctx.reply(`${emoji_ok} Done`, { reply_markup: { remove_keyboard: true } });
    }
    catch (error) {
        ctx.reply("💥 I could not update your categories, sorry!", { reply_markup: { remove_keyboard: true } });
    }
    finally {
        ctx.scene.leave();
    }
}

function abort(ctx) {
    try {
        ctx.reply(`${emoji_no} Okay, not updating categories`, { reply_markup: { remove_keyboard: true } });
    }
    catch (error) {
        ctx.reply("💥 Something went wrong!", { reply_markup: { remove_keyboard: true } });
        log.error("Error while aborting category stage", error);
    }
    finally {
        ctx.scene.leave();
    }
}

function cleanUp(ctx) {
    ctx.session.categories = undefined;
}

function buildCategoryKeyboard(ctx) {
    const keyboard = new Keyboard();
    try {
        const options = categories.map(c => ctx.session.categories.selected.includes(c) ? `[ #${c} ]` : `#${c}`);
        options.unshift(emoji_ok, emoji_no);
        options.push(...ctx.session.categories.selected.filter(c => !categories.includes(c)).map(c => `[ #${c} ]`));
        for (let i = 0; i < options.length; i += keyboard_width) {
            keyboard.add(options.slice(i, i + keyboard_width));
        }
    }
    catch (error) {
        log.error('Cannot build category keyboard', error);
    }
    return keyboard.draw();
}

/**
 * Takes a string and returns a single valid categroy, consisting of only alphanumeric characters and _ and beginning with a letter.
 * @param {The caption written by the user.} caption
 */
function escape_category(caption) {
    if (!caption) return null;
    if (typeof caption !== 'string') return null;
    return caption
        .replace(/[^\wäöüß]/gi, '') // Removes all characters that are not alphanumeric or _
        .replace(/^[\d_]+/g, '');       // Removes digits and _ from the beginning of the string
}

function parse_categories(input_stirng, slice = 0) {
    if (typeof input_stirng !== 'string') return [];
    return input_stirng
        .split(' ')
        .slice(slice)
        .map(escape_category)
        .filter(c => !!c);
}

module.exports.edit_categories = edit_categories;
module.exports.escape_category = escape_category;
module.exports.parse_categories = parse_categories;
