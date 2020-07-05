const { serializeError } = require('serialize-error');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const { Client } = require('redis-request-broker');

const _bot = require('./bot');
const util = require('./util');
const log = require('./log');
const _config = require('./config');
const lc = require('./lifecycle');
const db = require('./mongo-db');
const categories = require('./categories');
const admins = require('./admins');

// Stages
const stage_create = new Stage();
const scene_create_id = new Scene('id');
scene_create_id.enter(ctx => ctx.reply('Choose an id / name for the new contest:'));
scene_create_id.on('message', ctx => {
    const id = ctx.message.text;
    if (!/^[a-z]+$/i.test(id) || id.length < 1)
        return ctx.reply('That is not a valid name. Please use only letters. Try again:');

    ctx.session.id = id;
    ctx.scene.enter('tag');
});
const scene_create_tag = new Scene('tag');
scene_create_tag.enter(ctx => ctx.reply('Choose a hashtag that user choose to enter the contest:'));
scene_create_tag.on('message', ctx => {
    const tag = categories.escape_category(ctx.message.text);
    if (!tag)
        return ctx.reply('That is not a valid category. Try again:');

    ctx.session.tag = tag;
    ctx.reply(`Okay, using "${tag}"`);
    ctx.scene.enter('emoji');
});

const scene_create_emoji = new Scene('emoji');
scene_create_emoji.enter(ctx => ctx.reply('Choose an emoji for your contest:'));
scene_create_emoji.on('message', ctx => {
    // Testing for emojis is messy, we just check the length of the string.
    // Other charactes don't look nice, but that's not our problem.
    const emoji = ctx.message.text;
    if (emoji.length != 1)
        return ctx.reply('That does not look like an emoji. Try again:');

    ctx.session.emoji = emoji;
    ctx.scene.enter('finish');
});

const scene_create_finish = new Scene('finish');
scene_create_finish.enter(async ctx => {
    try {
        await ctx.reply('Great! Creating your new contest...');
        const created = await clients.create.request({
            id: ctx.session.id,
            tag: ctx.session.tag,
            emoji: ctx.session.emoji
        });
        if (!created)
            throw new Error('Worker returned invalid response. Contest has not been created.');

        await ctx.reply('Done! Here are some usefull commands to go from here:');
        await ctx.reply('/contest_start <id>  start your contest\n/contest_delete <id>  delete your contest');
        ctx.scene.leave();
    }
    catch (error) {
        await log.error('Failed to create new contest.', { error: serializeError(error), session: ctx.session });
        ctx.reply('Sorry, something did not work while creating your contest. See the logs for mor information.');
        ctx.scene.leave();
    }
})

let clients = {};
let group_id;
_config.subscribe('rrb', rrb => {
    await start(rrb);
});
_config.subscribe('config', c => {
    group_id = c.group_id;
})
_bot.subscribe(bot => {
    bot.use(stage_create.middleware());
    bot.command('contest_create', command_create);
    bot.command('contest_start', command_start);
    bot.command('contest_edit', command_edit);
    bot.command('contest_list', command_list);
    bot.command('contest_stop', command_stop);
    bot.command('contest_delete', command_delete);
});
lc.on('stop', stop);

async function start(rrb) {
    try {
        clients.create = new Client(rrb.queues.contestsCreate);
        clients.start = new Client(rrb.queues.contestsStart);
        clients.stop = new Client(rrb.queues.contestsStop);
        clients.delete = new Client(rrb.queues.contestsDelete);
        clients.list = new Client(rrb.queues.contestsList);
        await clients.create.connect();
        await clients.start.connect();
        await clients.stop.connect();
        await clients.delete.connect();
        await clients.list.connect();
    }
    catch (error) {
        log.error('Failed to start contests: Cannot connect to rrb.', error);
        setTimeout(() => lc.trigger('stop'), 100);
    }
}

async function stop() {
    for (const client of Object.values(clients)) {
        await client.disconnect();
    }
}

async function command_create(ctx) {
    if (!await validate(ctx))
        return;


}

async function command_start(ctx) {
    if (!await validate(ctx))
        return;
}

async function command_edit(ctx) {
    if (!await validate(ctx))
        return;
}

async function command_list(ctx) {
    if (!await validate(ctx))
        return;
}

async function command_stop(ctx) {
    if (!await validate(ctx))
        return;
}

async function command_delete(ctx) {
    if (!await validate(ctx))
        return;
}

/**
 * Validates a contest command. Contests my not be sent in the meme group (other groups are okay).
 * Also, only admins are allowed to issue these commands.
 * @param {*} ctx The context of the message
 * @returns {boolean} True, if this is a valid command request.
 */
async function validate(ctx) {
    // Check group
    if (ctx.message.chat.id === group_id) {
        ctx.deleteMessage(ctx.message.id).catch(e => log.error('Cannot delete command message', e));
        ctx.telegram.sendMessage(ctx.message.from.id, 'This command can not be sent in the meme group')
            .catch(e => log.error('Cannot send message to user', e));
        return false;
    }

    // Check admin
    if (!await admins.can_change_info(ctx.message.from)) {
        log.info('User tried to issue contest command without permission.', { user: ctx.message.from, command: ctx.state.command });
        return false;
    }

    return true;
}