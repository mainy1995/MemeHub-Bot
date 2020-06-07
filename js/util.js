
send_methods = {
    'photo': 'sendPhoto',
    'animation': 'sendAnimation',
    'video': 'sendVideo'
};

/**
 * Returns the file id of the largest photo in a message or null if no photo is present.
 * @param {any} message The message which contains the photo
 */
function photo_id(message) {
    if (!has_photo(message)) return null;
    return message.photo[message.photo.length - 1].file_id;
}

/**
 * Returns the file id of the animation in a message or null if none is present.
 * @param {any} message The message which contains the animation
 */
function animation_id(message) {
    if (!has_animation(message)) return null;
    return message.animation.file_id;
}

/**
 * Returns the file id of the video in a message or null if none is present.
 * @param {any} message The message which contains the video
 */
function video_id(message) {
    if (!has_video(message)) return null;
    return message.video.file_id;
}

/**
 * Returns the file id of any media in a message or null if none is present.
 * @param {any} message The message which may contain some kind of media
 */
function any_media_id(message) {
    if (has_photo(message)) return photo_id(message);
    if (has_animation(message)) return animation_id(message);
    if (has_video(message)) return video_id(message);
    return null;
}

/**
 * Checks weather a message contains a photo.
 * @param {any} message The message to check
 */
function has_photo(message) {
    if (!message) return false;
    return !!message.photo && message.photo.length > 0;
}

/**
 * Checks weather a message contains an animation.
 * @param {any} message The message to check
 */
function has_animation(message) {
    if (!message) return false;
    return !!message.animation;
}

/**
 * Checks weather a message contains a video.
 * @param {any} message The message to check
 */
function has_video(message) {
    if (!message) return false;
    return !!message.video;
}

/** 
 * Checks weather a message contains any kind of supported media
 * @param {any} message The message to check
 */
function has_any_media(message) {
    return has_photo(message) || has_animation(message) || has_video(message);
}

/**
 * Sends supported media types to the given chat.
 * @param {any} ctx The message context
 * @param {number} chat_id The chat to send to
 * @param {string} media_id The id of the media to send
 * @param {any} extra Extra parameters passed to the send method
 */
function send_any_media(ctx, chat_id, media_id, extra) {
    return send_media_by_type(ctx.telegram, chat_id, media_id, get_media_type_from_message(ctx.message), extra);
}

async function send_media_by_type(telegram, chat_id, media_id, media_type, extra) {
    if (!media_type in send_methods) throw "unknown media type";
    return await telegram[send_methods[media_type]](chat_id, media_id, extra);
}

function get_media_type_from_message(message) {
    if (has_photo(message)) return 'photo';
    if (has_animation(message)) return 'animation';
    if (has_video(message)) return 'video';
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

function is_private_chat(ctx) {
    return ctx.message.from.id == ctx.message.chat.id;
}

function is_reaction(ctx) {
    return !!ctx.update.message.reply_to_message;
}

module.exports.photo_id = photo_id;
module.exports.animation_id = animation_id;
module.exports.any_media_id = any_media_id;
module.exports.has_photo = has_photo;
module.exports.has_animation = has_animation;
module.exports.has_video = has_video;
module.exports.has_any_media = has_any_media;
module.exports.send_any_media = send_any_media;
module.exports.send_media_by_type = send_media_by_type;
module.exports.get_media_type_from_message = get_media_type_from_message;
module.exports.name_from_user = name_from_user;
module.exports.is_private_chat = is_private_chat;
module.exports.is_reaction = is_reaction;
