
send_methods = {
    'photo': 'sendPhoto',
    'animation': 'sendAnimation',
    'video': 'sendVideo'
};

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