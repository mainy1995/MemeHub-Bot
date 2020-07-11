
const { Client, Subscriber } = require('redis-request-broker');

const _bot = require('../bot');
const util = require('../util');
const log = require('../log');
const _config = require('../config');
const db = require('../mongo-db');
const admins = require('../admins');
const posting = require('../meme-posting');
const lc = require('../lifecycle');
const selectCategory = require('./scenes/select_category');
const scenes = require('../../data/scenes.json').categories;

const clients = {};
const subscribers = {};

_config.subscribe('rrb', async rrb => {
    try {
        // Init workers
        // Category management
        clients.createCategory = new Client(rrb.queues.categoriesCreate);
        clients.deleteCategory = new Client(rrb.queues.categoriesDelete);
        clients.listCategories = new Client(rrb.queues.categoriesList);
        clients.categoriesCreateMapping = new Client(rrb.queues.categoriesCreateMapping);
        clients.categoriesDeleteMapping = new Client(rrb.queues.categoriesDeleteMapping);
        clients.categoriesMappings = new Client(rrb.queues.categoriesMappings);
        clients.validateCategories = new Client(rrb.queues.categoriesValidate);
        clients.getOrSetMaximum = new Client(rrb.queues.categoriesGetOrSetMaximum);

        // Categories of memes
        clients.getCategories = new Client(rrb.queues.categoriesGet);
        clients.setCategories = new Client(rrb.queues.categoriesSet);
        clients.addCategories = new Client(rrb.queues.categoriesAdd);
        clients.removeCategories = new Client(rrb.queues.categoriesRemove);

        // Contests
        clients.listContests = new Client(rrb.queues.contestsList);

        // Init subscribers
        subscribers.contestStarted = new Subscriber(rrb.events.contestStarted, contestsChanged);
        subscribers.contestStopped = new Subscriber(rrb.events.contestStopped, contestsChanged);
        subscribers.contestCreated = new Subscriber(rrb.events.contestCreated, contestsChanged);
        subscribers.contestDeleted = new Subscriber(rrb.events.contestDeleted, contestsChanged);
        subscribers.categoryCreated = new Subscriber(rrb.events.categoryCreated, categoryCreatedOrDeleted);
        subscribers.categoryDeleted = new Subscriber(rrb.events.categoryDeleted, categoryCreatedOrDeleted);
        subscribers.categoryMaximumChanged = new Subscriber(rrb.events.categoryMaximumChanged, selectCategory.setMaximum);

        for (const c of Object.values(clients))
            await c.connect()

        for (const s of Object.values(subscribers))
            await s.listen();

    }
    catch (error) {
        await log.error('Failed to start categories', error);
        lc.trigger('stop');
    }
});
_bot.subscribe(bot => { // Has to be done before require forwarding
    bot._stage.register(
        selectCategory.build(clients),
        require('./scenes/create_category').build(clients),
        require('./scenes/create_mapping_category').build(clients),
        require('./scenes/create_mapping_key').build(clients),
        require('./scenes/delete_category').build(clients),
        require('./scenes/delete_mapping').build(clients),
        require('./scenes/list_categoires').build(clients),
        require('./scenes/list_mappings').build(clients),
        require('./scenes/menu').build(clients),
        require('./scenes/set_maximum').build(clients),
    );
    bot.command('edit_categories', command_edit_categories);
    bot.command('set_categories', command_set_categories);
    bot.command('add_categories', command_add_categories);
    bot.command('remove_categories', command_remove_categories);
    bot.command('categories', command_categories);

});
lc.on('stop', stop);
lc.late('start', async () => {
    try {
        await refreshContests();
        await refreshCategories();
        await refreshMaximum();
    }
    catch (error) {
        await log.error('Failed to retrieve initial category state.', error);
        lc.trigger('stop');
    }
});

async function stop() {
    try {
        for (const c of Object.values(clients))
            await c.disconnect().catch(e => log.warn('Error while stopping rrb client', e));

        for (const s of Object.values(subscribers))
            await s.stop().catch(e => log.warn('Error while stopping rrb subscriber', e));

    }
    catch (error) {
        await log.warn('Failed to stop categories module', error);
    }
}

async function command_categories(ctx) {
    // Check group
    if (!util.is_private_chat(ctx)) {
        ctx.deleteMessage(ctx.message.id).catch(e => log.error('Cannot delete command message', e));
        ctx.telegram.sendMessage(ctx.message.from.id, 'The /categories command can only be used here')
            .catch(e => log.error('Cannot send message to user', e));
        return;
    }

    // Check admin
    if (!await admins.can_change_info(ctx.message.from)) {
        log.info('User tried to issue categories command without permission.', { user: ctx.message.from, command: ctx.state.command });
        return;
    }

    ctx.scene.enter(scenes.MENU);
}

/**
 * Edits the categories of a meme.
 * @param {The current telegraf context} ctx
 */
async function edit_categories(ctx, meme_id, post_afterward = false) {
    try {
        const selected = await clients.getCategories.request(meme_id);
        ctx.session.categories = { meme_id, selected, post_afterward };
        ctx.scene.enter(scenes.SELECT);
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
        const meme_id = await get_meme_id_from_command(ctx);
        if (!meme_id) {
            log.info('Abotring /set_categories command', 'No media id found or user is not permitted to edit the categories.');
            return;
        }
        const categories = ctx.state.command.splitArgs
        const ok = await clients.setCategories.request({ meme_id, categories, validate: true });

        if (util.is_private_chat(ctx))
            await ctx.reply(ok ? `✅ Done` : "❌ Didn't work");
    }
    catch (error) {
        log.error("Cannot handle command /set_categories", error);
    }
}

async function command_add_categories(ctx) {
    try {
        const meme_id = await get_meme_id_from_command(ctx);
        if (!meme_id) {
            log.info('Abotring /add_categories command', 'No media id found or user is not permitted to edit the categories.');
            return;
        }
        const categories = ctx.state.command.splitArgs
        const ok = await clients.addCategories.request({ meme_id, categories, validate: true });

        if (util.is_private_chat(ctx))
            await ctx.reply(ok ? `✅ Done` : "❌ Didn't work");

    }
    catch (error) {
        log.error("Cannot handle command /add_categories", error);
    }
}

async function command_remove_categories(ctx) {
    try {
        const meme_id = await get_meme_id_from_command(ctx);
        if (!meme_id) {
            log.info('Abotring /remove_categories command', 'No media id found or user is not permitted to edit the categories.');
            return;
        }
        const categories = ctx.state.command.splitArgs
        const ok = await clients.removeCategories.request({ meme_id, categories, validate: true });

        if (util.is_private_chat(ctx))
            await ctx.reply(ok ? `✅ Done` : "❌ Didn't work");
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
    // delete request, if is in group chat
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

module.exports.validate_categories = async function validate_categories(input_stirng, slice = 0) {
    if (typeof input_stirng !== 'string') return [];
    return clients.validateCategories.request(input_stirng.split(' ').slice(slice));
}

async function refreshContests() {
    try {
        const contests = await clients.listContests.request({ onlyRunning: false });
        const contestsRunning = contests.filter(c => c.running);
        posting.set_contest_data(contests);
        selectCategory.setContests(contestsRunning);
    }
    catch (error) {
        log.warn('Failed to get contests. Category buttons might not include up-to-date data.', error);
    }
}

async function contestsChanged(_) {
    await refreshContests();
}


async function refreshCategories() {
    try {
        selectCategory.setCategories(await clients.listCategories.request());
    }
    catch (error) {
        log.warn('Failed to get categories. Category buttons might not include up-to-date data.', error);
    }
}

async function categoryCreatedOrDeleted({ categories }) {
    selectCategory.setCategories(categories);
}

async function refreshMaximum() {
    try {
        selectCategory.setMaximum(await clients.getOrSetMaximum.request());
    }
    catch (error) {
        log.warn('Failed to get category maximum. Category buttons might not include up-to-date data.', error);
    }

}


module.exports.edit_categories = edit_categories;
