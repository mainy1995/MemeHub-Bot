const util = require('./util');
const config = require('./config');
const db = require('./mongo-db');
const categories = require('./categories');
const achievements = require('./achievements');
const voting = require('./meme-voting');

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
        
        console.log(` === Meme request from user "${options.user.first_name} ${options.user.last_name}" ===`);

        if (!options.user.username) {
            ctx.reply('Posting without username not allowed! Choose a username in the settings.');
            console.log("Aborting due to missung username");
            return;
        }
        if (options.user.is_bot) {
            ctx.reply('Only humans may send memes, sorry!')
            console.log("Aborting because user is a bot");
            return;
        }
        if (options.file_id === null) {
            ctx.reply('It looks like I am not able to send this kind of meme, sorry!')
            console.log("Aborting due to missing file id");
            return
        }
        
        await db.connected;
        db.save_user(options.user);
        
        if (!options.category) {
            categories.ask(ctx, options);
            return;
        }
        process_meme(ctx, options);
    }
    catch(exception) {
        console.log("ERROR: Unknown exception");
        console.log(`  > Exception: ${exception}`);
    }
}

function process_meme(ctx, options) {
    ctx.reply("Sending you meme ✈️", { reply_markup: { remove_keyboard: true }});
    db.save_meme(options.user.id, options.file_id, options.file_type, options.message_id, options.category)
        .then(() => { 
            forward_meme_to_group(ctx, options.file_id, options.file_type, options.user, options.category);
            ctx.reply('👍');
            setTimeout(() => achievements.check_post_archievements(ctx), 100); // Timeout so it's not blocking anything important
        })
        .catch((err) => {
            if (!!err.code && err.code == 11000) {
                ctx.telegram.sendMessage(options.user.id, 'REPOST DU SPAST 😡');
                return;
            }
            console.log(err);
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
function forward_meme_to_group(ctx, file_id, file_type, user, category) {
    let caption = `@${user.username}`
    if (category) caption += ` | #${category}`;

    return util.send_media_by_type(
        ctx,
        config.group_id,
        file_id,
        file_type,
        {
            caption: caption,
            reply_markup: {
                inline_keyboard: voting.create_keyboard([])
            }
        }
    )
    .catch((err) => {
        console.log("ERROR: Could not send meme to group");
        console.log(`  > Error: ${err}`);
    })
    .then((ctx) => { 
        console.log("Meme send to group");
        db.save_meme_group_message(ctx);
    });
}

module.exports.handle_meme_request = handle_meme_request;
module.exports.process_meme = process_meme;
module.exports.forward_meme_to_group = forward_meme_to_group;