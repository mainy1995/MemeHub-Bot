const util = require('./util');
const log = require('./log');
const _config = require('./config');
const _bot = require('./bot');
const db = require('./mongo-db');
const categories = require('./categories');
const achievements = require('./achievements');
const voting = require('./meme-voting');

let group_id = undefined;
_config.subscribe('config', c => group_id = c.group_id);
_bot.subscribe(bot => {
    bot.on('photo', handle_meme_request);
    bot.on('animation', handle_meme_request);
    bot.on('video', handle_meme_request);
});


/**
 * Saves memes to the db, forwards them and handles upvoting
 * @param {The telegraph message context} ctx
 * @param {A callback used to find the file id of the media in that message} file_id_callback
 */
async function handle_meme_request(ctx) {
    try {
        const options = {
            user: ctx.message.from,
            file_id: util.any_media_id(ctx.message),
            file_type: util.get_media_type_from_message(ctx.message),
            message_id: ctx.message.message_id,
            category: util.escape_category(ctx.message.caption)
        };

        const username = util.name_from_user(options.user);
        log.info(`Meme request from user "${username}"`, options);

        if (!is_private_chat(ctx)) {
            if (is_reaction(ctx)) return; // Don't do anything if the message is a reaction (reply) to some other message
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


        await db.connected;
        db.save_user(options.user);

        if (!options.category) {
            categories.ask(ctx).then(category => {
                options.category = category;
                process_meme(ctx, options);
            }).catch(reason => {
                log.info("Choosing a category failed.", {
                    reason,
                    options
                });
            });
            return;
        };

        process_meme(ctx, options);
    }
    catch (exception) {
        log.error("Cannot handle meme request", { exception, request_message: ctx.message });
    }
}

function is_private_chat(ctx) {
    return ctx.message.from.id == ctx.message.chat.id;
}

function is_reaction(ctx) {
    return !!ctx.update.message.reply_to_message;
}

function process_meme(ctx, options) {
    db.save_meme(options.user.id, options.file_id, options.file_type, options.message_id, options.category)
        .then(() => {
            ctx.reply("Sending you meme ✈️");
            forward_meme_to_group(ctx, options.file_id, options.file_type, options.user, options.category);
            ctx.reply('👍');
            setTimeout(() => achievements.check_post_archievements(ctx), 100); // Timeout so it's not blocking anything important
        })
        .catch((error) => {
            if (!!error && error.code == 11000) {
                ctx.telegram.sendMessage(options.user.id, 'REPOST DU SPAST 😡');
                return;
            }
            log.error("Cannot store meme request in db", { error, options });
            ctx.reply("Something went horribly wrong 😢 I cannot send your meme!");
        });
}

/**
 * Forwards a meme to the meme group.
 * @param {The message context of the users meme request} ctx
 * @param {The id of the meme media} file_id
 * @param {The user that wants the meme to be forwarded} user
 * @param {The category of the meme or null for no category} category
 * @returns {The promise that is returned by the send method}
 */
async function forward_meme_to_group(ctx, file_id, file_type, user, category) {
    const extra = {
        caption: build_caption(user, category),
        reply_markup: {
            inline_keyboard: voting.create_keyboard([])
        }
    }
    try {
        await util.send_media_by_type(ctx, group_id, file_id, file_type, extra);
        await db.save_meme_group_message(ctx);
    }
    catch (error) {
        await log.error("Cannot not send meme to group", error);
    }
}

function build_caption(user, category) {
    let caption = `@${user.username}`
    if (category) caption += ` | #${category}`;
    return caption;
}

module.exports.handle_meme_request = handle_meme_request;
module.exports.process_meme = process_meme;
module.exports.forward_meme_to_group = forward_meme_to_group;
module.exports.build_caption = build_caption;

