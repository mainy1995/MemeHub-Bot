const { Client } = require('redis-request-broker');
const { serializeError } = require('serialize-error');

const util = require('./util');
const log = require('./log');
const lc = require('./lifecycle');
const db = require('./mongo-db');
const _bot = require('./bot');
const _config = require('./config');
const admins = require('./admins');

let clientGetQuota;
let clientIssueTokens;
_config.subscribe('rrb', async rrb => {
    await stop();
    clientGetQuota = new Client(rrb.queues.getUserQuota);
    clientIssueTokens = new Client(rrb.queues.issueTokens);
    await clientGetQuota.connect();
    await clientIssueTokens.connect();
});

_bot.subscribe(bot => {
    bot.command('tokens', show_quota); // zeigt die anzahl an tokens an, die ein nutzer hat
    bot.command('issue', issue_tokens);
});

lc.on('stop', stop);
async function stop() {
    if (clientGetQuota)
        await clientGetQuota.disconnect();

    if (clientIssueTokens)
        await clientIssueTokens.disconnect();
}

async function show_quota(ctx) {
    const user_id = ctx.message.from.id;

    if (!util.is_private_chat(ctx)) {
        ctx.deleteMessage(ctx.message.id);
        return;
    }

    try {
        const quota = await clientGetQuota.request({ user_id });
        ctx.reply(`Your Meme Tokens: ${quota.tokens}\nRemaining free posts: ${quota.freePosts}`);
    }
    catch (error) {
        log.warning('Failed to handle quota request', { error: serializeError(error), user_id });
        ctx.reply("Sorry, I can't help you right now.");
    }
}

async function issue_tokens(ctx) {
    try {

        const is_private = util.is_private_chat(ctx)

        // Delete command in group
        if (!is_private)
            ctx.deleteMessage(ctx.message.id);

        // Check whether the user is allowed to issue tokens
        if (!await admins.can_change_info(ctx.message.from)) {
            log.info('User without privileges tried to issue meme tokens.', { user: util.message.from });
            return;
        }

        // Get the targeted user
        let target = ctx.state.command.splitArgs[0]
        if (!target) {
            log.info('Failed to handle issue tokens command: no target provided.', { command: ctx.state.command, user: ctx.message.from });
            ctx.telegram.sendMessage(ctx.message.from.id, 'You have to provide a username.');
            return;
        }

        // Get the amount
        const amount = parseInt(ctx.state.command.splitArgs[1]);
        if (!amount) {
            log.info('Failed to handle issue tokens command: no valid amount provided.', { command: ctx.state.command, user: ctx.message.from });
            ctx.telegram.sendMessage(ctx.message.from.id, 'You have to provide a valid amount.');
            return;
        }


        // Remove @ if given
        if (target[0] === '@')
            target = target.slice(1);

        // Query user from db
        const user = await db.get_user_by_username(target);
        if (!user) {
            log.info('Failed to handle issue tokens command: User not found.', { command: ctx.state.command });
            ctx.telegram.sendMessage(ctx.message.from.id, 'Cannot find this user.');
            return;
        }

        // Send request to issue tokens
        const newAmount = await clientIssueTokens.request({ user_id: user.id, amount });
        ctx.telegram.sendMessage(ctx.message.from.id, `Changed meme tokens of user '${user.username}' by ${amount}. New amount: ${newAmount}.`);
    }
    catch (error) {
        log.warn('Failed to handle issue tokens command: Error thrown', { error: serializeError(error), command: ctx.state.command });
        ctx.telegram.sendMessage(ctx.message.from.id, 'Sorry, something went wrong.');
    }

}
