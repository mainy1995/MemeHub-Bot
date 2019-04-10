/**
 * Returns the file id of the largest photo in a message or null if no photo is present.
 * @param {the message which contains the photo} message 
 */
function photo_id(message) {
    if (!has_photo(message)) return null
    return message.photo[message.photo.length - 1].file_id
}

/**
 * Returns the file id of the animation in a message or null if none is present.
 * @param {The message which contains the animation} message 
 */
function animation_id(message) {
    if (!has_animation(message)) return null
    return message.animation.file_id
}

/**
 * Returns the file id of any media in a message or null if none is present.
 * @param {The message which may contain some kind of media} message 
 */
function any_media_id(message) {
    if (has_photo(message)) return photo_id(message)
    if (has_animation(message)) return animation_id(message)
    return null
}

/**
 * Checks weather a message contains a photo.
 * @param {The message to check} message 
 */
function has_photo(message) {
    return !!message.photo && message.photo.length > 0
}

/**
 * Checks weather a message contains an animation.
 * @param {The message to check} message 
 */
function has_animation(message) {
    return !!message.animation
}

/**
 * Sends supported media types to the given chat.
 * @param {The message context} ctx 
 * @param {The chat to send to} chat_id 
 * @param {The id of the media to send} media_id
 * @param {Extra parameters passed to the send method} extra
 */
function send_any_media(ctx, chat_id, media_id, extra) {
    if (has_photo(ctx.message)) return ctx.telegram.sendPhoto(chat_id, media_id, extra)
    if (has_animation(ctx.message)) return ctx.telegram.sendAnimation(chat_id, media_id, extra)
    return Promise.reject();
}

/**
 * Takes a string and returns a single valid categroy, consisting of only alphanumeric characters and _.
 * @param {The caption written by the user.} caption 
 */
function categroy_from_cation(caption) {
    if (!caption) return null;
    if (typeof caption !== 'string') return null;
    return caption.replace(/\W/g, '') // Removes all characters that are not alphanumeric or _
}

/**
 * Tries to load an environment variable and terminates the program, if none is found.
 * @param {The name of the environment variable} name 
 */
function load_env_variable(name) {
    let value = process.env[name];
    if (!value) {
        console.error(`ERROR: Please supply '${name}'`);
        process.exit(1);
    }
    return value
}

module.exports.photo_id = photo_id;
module.exports.animation_id = animation_id;
module.exports.any_media_id = any_media_id;
module.exports.has_photo = has_photo;
module.exports.has_animation = has_animation;
module.exports.send_any_media = send_any_media;
module.exports.categroy_from_cation = categroy_from_cation;
module.exports.load_env_variable = load_env_variable