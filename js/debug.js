const maintain = require('./meme-maintaining');
const db = require('./mongo-db');
const log = require('./log');
const _config = require('./config');
const _bot = require('./bot');
const forwarding = require('./meme-forwarding');
const lc = require('./lifecycle');
const util = require('./util');


let config = {};
let mha_users = {};
let mha = {};
_config.subscribe('debug', c => config = c);
_config.subscribe('mha', m => mha = m);
_config.subscribe('users', u => mha_users = u);
_bot.subscribe(bot => {
    bot.use(log_all_updates);
    bot.command('chatinfo', reply_with_chatinfo);
    bot.command('updateusername', trigger_update_user_name);
    bot.command('mha', show_voting_token);
    bot.command('meme', show_meme);
});

lc.hook(async (stage, event) => {
    if (!config.log_lifecycle_events) return;
    log.info(`Lifecycle ${stage}:${event}`);
});


async function reply_with_chatinfo(ctx) {
    if (!config.command_chatinfo) return;
    log.info('Chat info', ctx.update.message.chat);
    ctx.reply(JSON.stringify(ctx.update.message.chat, null, '  '));
}

async function trigger_update_user_name(ctx) {
    if (!config.command_update_username) return;
    const user = await db.get_user(ctx.update.message.from.id);
    maintain.update_user_name(user);
}

async function log_all_updates(ctx, next) {
    if (!config.log_all_updates) {
        next();
        return;
    }

    log.info('Incoming update', ctx.update);
    next();
}

async function show_voting_token(ctx) {
    if (!config.command_voting_token) return;
    if (ctx.chat.type !== "private") return;
    const user = ctx.update.message.from.id;
    const tokens = Object.keys(mha_users).filter(k => mha_users[k].id == user);
    if (tokens.length < 1) {
        ctx.reply("You are not allowed to vote 🙃");
        return;
    }

    if (tokens.length > 1) {
        await log.warning("Found multiple token for user to vote with", { context: ctx });
    }

    ctx.reply(`You can cast your vote here:\n${mha.broadcast.url_base}${tokens[0]}`);
}

async function show_meme(ctx) {
    const id = ctx.state.command.splitArgs[0];

    if (!id) {
        ctx.reply("You need to include an id in your request");
        return;
    }
    try {
        const meme = await db.get_meme_by_id(id);
        console.log(meme);
        forwarding.forward_meme(ctx, meme._id, meme.type, meme.user, meme.category, ctx.chat.id);
    }
    catch (error) {
        log.error("Cannot show meme", error);
    }
}
