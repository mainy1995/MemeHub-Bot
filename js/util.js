const config = require("../config/config.json");

send_methods = {
    'photo': 'sendPhoto',
    'animation': 'sendAnimation',
    'video': 'sendVideo'
};

let bot;

/**
 * Sets the Telegraf object to use when sending messages without a context.
 * @param {The Telegraf object to use when sending messages without a context} _bot 
 */
function set_bot(_bot) {
    bot = _bot;
}

/**
 * Returns the file id of the largest photo in a message or null if no photo is present.
 * @param {the message which contains the photo} message 
 */
function photo_id(message) {
    if (!has_photo(message)) return null;
    return message.photo[message.photo.length - 1].file_id;
}

/**
 * Returns the file id of the animation in a message or null if none is present.
 * @param {The message which contains the animation} message 
 */
function animation_id(message) {
    if (!has_animation(message)) return null;
    return message.animation.file_id;
}

/**
 * Returns the file id of the video in a message or null if none is present.
 * @param {The message which contains the video} message 
 */
function video_id(message) {
    if (!has_video(message)) return null;
    return message.video.file_id;
}

/**
 * Returns the file id of any media in a message or null if none is present.
 * @param {The message which may contain some kind of media} message 
 */
function any_media_id(message) {
    if (has_photo(message)) return photo_id(message);
    if (has_animation(message)) return animation_id(message);
    if (has_video(message)) return video_id(message);
    return null;
}

/**
 * Checks weather a message contains a photo.
 * @param {The message to check} message 
 */
function has_photo(message) {
    if (!message) return false;
    return !!message.photo && message.photo.length > 0;
}

/**
 * Checks weather a message contains an animation.
 * @param {The message to check} message 
 */
function has_animation(message) {
    if (!message) return false;
    return !!message.animation;
}

/**
 * Checks weather a message contains a video.
 * @param {The message to check} message 
 */
function has_video(message) {
    if (!message) return false;
    return !!message.video;
}

/**
 * Sends supported media types to the given chat.
 * @param {The message context} ctx 
 * @param {The chat to send to} chat_id 
 * @param {The id of the media to send} media_id
 * @param {Extra parameters passed to the send method} extra
 */
function send_any_media(ctx, chat_id, media_id, extra) {
    return send_media_by_type(ctx, chat_id, media_id, get_media_type_from_message(ctx.message), extra);
}

function send_media_by_type(ctx, chat_id, media_id, media_type, extra) {
    if (!media_type in send_methods) return Promise.reject();
    return ctx.telegram[send_methods[media_type]](chat_id, media_id, extra);
}

function get_media_type_from_message(message) {
    if (has_photo(message)) return 'photo';
    if (has_animation(message)) return 'animation';
    if (has_video(message)) return 'video';
}

/**
 * Takes a string and returns a single valid categroy, consisting of only alphanumeric characters and _.
 * @param {The caption written by the user.} caption 
 */
function escape_category(caption) {
    if (!caption) return null;
    if (typeof caption !== 'string') return null;
    return caption.replace(/\W/g, ''); // Removes all characters that are not alphanumeric or _
}

function name_from_user(user) {
    let name = user.username;
    if (!!name) return `@${name}`;

    name = 'Unknonwn User';

    if (!!user.first_name) {
        name = user.first_name;
        if (!!user.last_name) return name + ` ${user.last_name}`;
    }
    else if (!!user.last_name) return user.last_name;
    return name;
}

/**
 * universal error logging. prints the error to the console, but also sends a message to every chat in the error_chats array of the config
 * @param {*} problem 
 * @param {*} error 
 */
function log_error(problem, error) {
    console.log(`    \x1b[31m%s\x1b[0m ${problem}`, "ERROR:");
    console.log(`      > ${JSON.stringify(error, null, '  ')}`);
    send_log_message(`Error: ${problem}\n\n > ${JSON.stringify(error, null, '  ')}`);
}

function log_warning(problem, data) {
    console.log(`    \x1b[45m%s\x1b[0m ${problem}`, 'WARNING:');
    if (data) console.log(`      > ${JSON.stringify(data, null, '  ')}`);
    send_log_message(`WARNING: ${problem}` + !!data ? `\n\n > ${JSON.stringify(data, null, '  ')}` : '');
}

function log_info(info, data) {
    console.log(`    \x1b[34m%s\x1b[0m ${info}`, 'INFO:');
    if (data) console.log(`      > ${JSON.stringify(data, null, '  ')}`);
}

/**
 * Sends an message to all chats in the log_chats array of the config
 * @param {The message to send} message 
 */
function send_log_message(message) {
    if (!bot) {
        console.log('    \x1b[31m%s\x1b[0m Cannot send log message', "ERROR:");
        console.log(`      > Telegraf bot object not set in util.js`);
        return;
    }
    try {
        for(id of config.log_chats) {
            bot.telegram.sendMessage(id, message);
        }
    }
    catch(e) {
        console.log('    \x1b[31m%s\x1b[0m Failed sending log message', "ERROR:");
        console.log(`      > ${e}`);
    }
}

module.exports.set_bot = set_bot;
module.exports.photo_id = photo_id;
module.exports.animation_id = animation_id;
module.exports.any_media_id = any_media_id;
module.exports.has_photo = has_photo;
module.exports.has_animation = has_animation;
module.exports.has_video = has_video;
module.exports.send_any_media = send_any_media;
module.exports.send_media_by_type = send_media_by_type;
module.exports.get_media_type_from_message = get_media_type_from_message;
module.exports.escape_category = escape_category;
module.exports.name_from_user = name_from_user;
module.exports.log_error = log_error;
module.exports.log_warning = log_warning;
module.exports.log_info = log_info;
module.exports.send_log_message = send_log_message;