const { Client } = require('redis-request-broker');
const { serializeError } = require('serialize-error');

const util = require('./util');
const log = require('./log');
const _config = require('./config');
const _bot = require('./bot');
const db = require('./mongo-db');
const lc = require('./lifecycle');
const categories = require('./categories');
const posting = require('./meme-posting');

let limits;

_config.subscribe('rrb', async rrb => {
    await stop();
    limits = new Client(rrb.queues.mayUserPost);
    await limits.connect();
});

_bot.subscribe(bot => {
    bot.on('photo', handle_meme_request);
    bot.on('animation', handle_meme_request);
    bot.on('video', handle_meme_request);
});

lc.on('stop', stop);
async function stop() {
    if (limits) await limits.disconnect();
}


/**
 * Handles a meme request. If everything looks fine, the meme will be stored in the db.
 * If categories were provieded, the meme will be posted. Otherwise The user will be asked
 * to enter some, which will trigger the posting afterwards.
 * @param {any} ctx  The telegraph message context
 * @param {any} file_id_callback A callback used to find the file id of the media in that message
 */
async function handle_meme_request(ctx) {
    try {
        const options = {
            user: ctx.message.from,
            file_id: util.any_media_id(ctx.message),
            file_type: util.get_media_type_from_message(ctx.message),
            message_id: ctx.message.message_id,
            categories: await categories.validate_categories(ctx.message.caption)
        };

        const username = util.name_from_user(options.user);
        log.info(`Meme request from user "${username}"`, options);

        if (!util.is_private_chat(ctx)) {
            if (util.is_reaction(ctx)) return; // Don't do anything if the message is a reaction (reply) to some other message
            ctx.deleteMessage(ctx.message.message_id);
            ctx.telegram.sendMessage(options.user.id, 'Please only send memes here in the private chat!');
            log.info("Aborting meme request due to wrong chat");
            return;
        }

        if (!options.user.username) {
            ctx.reply('Posting without a username is not allowed! Please choose a username in the settings.');
            log.info("Aborting meme request due to missung username");
            return;
        }
        if (options.user.is_bot) {
            ctx.reply('Only humans may send memes, sorry!')
            log.info("Aborting meme request because user is a bot");
            return;
        }
        if (options.file_id === null) {
            ctx.reply('It looks like I am not able to send this kind of meme, sorry!')
            log.warning("Aborting meme request due to missing file id", ctx.message);
            return
        }

        // Check post limit
        try {
            const mayPost = await limits.request({ user_id: options.user.id });
            if (!mayPost) {
                ctx.reply('Sorry, you are not allowed to post any more today. Come back tomorrow!');
                log.info('Aborting meme request because of the post limit.', { options });
                return;
            }
        }
        catch (error) {
            log.warning('Failed to check the post limit. Allowing user to post.', { error: serializeError(error), options });
        }

        await db.connected;
        db.save_user(options.user);

        let meme_id = undefined;
        try {
            meme_id = await db.save_meme(options.user.id, options.file_id, undefined, options.file_type, options.message_id, options.categories);
        }
        catch (error) {
            /* One problem might be, that the meme is already in the db.
             * If the meme has not been posted, we want to continue as usual. */
            if (error && error.code == 11000) {
                const meme = await db.get_meme_by_id(options.file_id);
                if (meme.group_message_id) {
                    ctx.telegram.sendMessage(options.user.id, 'Seems to be a repost 🤷');
                    return;
                }

                meme_id = meme._id;
            }
            else {
                log.error("Cannot store meme request in db", { error, options });
                ctx.telegram.sendMessage(options.user.id, "Something went horribly wrong 😢 I cannot save your meme!");
                return;
            }
        }

        if (options.categories.length < 1)
            categories.edit_categories(ctx, meme_id, true);
        else
            posting.post_meme(meme_id);
    }
    catch (exception) {
        log.error("Cannot handle meme request", { error: serializeError(exception), request_message: ctx.message });
    }
}
