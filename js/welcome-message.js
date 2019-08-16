const config = require('../config/config.json');

async function greet_new_user(ctx) {    
   ctx.reply("Wilkommen @"+ctx.message.new_chat_member.username,
     {reply_markup: {     
  inline_keyboard:  [[{text:"Get Started",url:"https://www.t.me/mh_leif_bot?start="}]]}});     
}
module.exports.greet_new_user = greet_new_user;