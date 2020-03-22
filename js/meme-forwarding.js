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
            categories: categories.parse_categories(ctx.message.caption)
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

        await db.connected;
        db.save_user(options.user);

        let meme_id = undefined;
        try {
            meme_id = await db.save_meme(options.user.id, options.file_id, undefined, options.file_type, options.message_id, options.categories);
            ctx.reply("Sending you meme ✈️");
            await forward_meme_to_group(ctx, options.file_id, options.file_type, options.user, options.categories);
            setTimeout(() => achievements.check_post_archievements(ctx), 100); // Timeout so it's not blocking anything important
        }
        catch (error) {
            if (!!error && error.code == 11000) {
                ctx.telegram.sendMessage(options.user.id, 'REPOST DU SPAST 😡');
                return;
            }
            log.error("Cannot store meme request in db", { error, options });
            ctx.telegram.sendMessage(options.user.id, "Something went horribly wrong 😢 I cannot send your meme!");
            return;
        }

        if (!options.categories.length > 0) categories.edit_categories(ctx, meme_id);
    }
    catch (exception) {
        log.error("Cannot handle meme request", { exception, request_message: ctx.message });
    }
}

/**
 * Forwards a meme to the meme group.
 * @param {The message context of the users meme request} ctx
 * @param {The id of the meme media} file_id
 * @param {The user that wants the meme to be forwarded} user
 * @param {The lsit of categories of the meme (empty for no category)} categories
 * @returns {The promise that is returned by the send method}
 */
async function forward_meme_to_group(ctx, file_id, file_type, user, categories) {
    const extra = {
        caption: build_caption(user, categories),
        reply_markup: {
            inline_keyboard: voting.create_keyboard([])
        }
    }
    try {
        const result = await util.send_media_by_type(ctx, group_id, file_id, file_type, extra);
        await db.save_meme_group_message(file_id, result.message_id);
    }
    catch (error) {
        log.error("Cannot not send meme to group", error);
    }
}

function build_caption(user, categories) {
    let caption = `@${user.username}`
    if (categories && categories.length > 0)
        caption += ` | ${categories.map(c => `#${c}`).join(' · ')}`;

    return caption;
}

module.exports.handle_meme_request = handle_meme_request;
module.exports.forward_meme_to_group = forward_meme_to_group;
module.exports.build_caption = build_caption;

