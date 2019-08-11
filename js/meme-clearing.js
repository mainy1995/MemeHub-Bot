const util = require('./util');
const config = require('./config');
const db = require('./mongo-db');
const categories = require('./categories');
const achievements = require('./achievements');
const voting = require('./meme-voting');

/**
 * Checks Message if its from Admin and if it contains Repost
 * @param {The telegraph message context} ctx 
 */
function is_clearing_request(ctx){
    if(ctx.update.message.from.id=='18267377'&&ctx.update.message.reply_to_message!=null&&ctx.update.message.text=='#repost')
     return true;
     else
     return false;
}
/**
 * Deletes Repost and Anser Message
 * @param {The telegraph message context} ctx 
 */
function clear_repost(ctx){
    var repost_msg_id=ctx.update.message.reply_to_message.message_id;
    var answer_msg_id=ctx.update.message.message_id;
    db.save_repost(repost_msg_id);
    ctx.deleteMessage(repost_msg_id);
    ctx.deleteMessage(answer_msg_id);    
}


module.exports.clear_repost = clear_repost;
module.exports.is_clearing_request = is_clearing_request;