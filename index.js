const { Composer, log, session } = require('micro-bot')
var mysql = require('mysql');

//Read SQL Connection from console
const mysql_password =  process.env.MYSQL_PASSWORD
if (!mysql_password) {
  console.error(`μ-bot: Please supply MYSQL_PASSWORD`)
  process.exit(1)
}
const mysql_host =  process.env.MYSQL_HOST
if (!mysql_host) {
  console.error(`μ-bot: Please supply MYSQL_HOST`)
  process.exit(1)
}

const mysql_user = process.env.MYSQL_USER
if (!mysql_user) {
    console.error(`μ-bot: Please supply MYSQL_USER`)
    process.exit(1)
}

const mysql_db = process.env.MYSQL_DB
if (!mysql_user) {
    console.error(`μ-bot: Please supply MYSQL_DB`)
    process.exit(1)
}
  
//Create SQL Connection
var con = mysql.createConnection({
    host: mysql_host,
    user: mysql_user,
    password: mysql_password,
    database: mysql_db
    });

const group_id = process.env.GROUP_ID
if (!mysql_user) {
    console.error(`μ-bot: Please supply GROUP_ID`)
    process.exit(1)
}

const bot = new Composer()

bot.use(log());
bot.use(session());

//replay to /start
bot.start(({ reply }) => reply('Welcome message'));

//replay to /help
bot.help(({ reply }) => reply('Help message'));

//replat on /date
bot.command('date', ({ reply }) => reply(`Server time: ${Date()}`));

//replay to /setting
bot.settings(({ reply }) => reply('Bot settings'));

//bindigs for different media types
bot.on('photo', (ctx) => handle_media_message(ctx, photo_id, send_photo));
bot.on('animation', (ctx) => handle_media_message(ctx, animation_id, send_animation));




/**
 * Returns the file id of the largest photo in a message or null if no photo is present.
 * @param {the message which contains the photo} message 
 */
function photo_id(message) {
    if (!has_photo(message)) return null
    return message.photo[message.photo.length-1].file_id
}

/**
 * Returns the file id of the animation in a message or null if none is present.
 * @param {The mesaage which contains the animation} message 
 */
function animation_id(message) {
    if (!has_animation(message)) return null
    return message.animation.file_id
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
 * Returns a method to send a photo
 * @param {The context to use} ctx 
 */
function send_photo(ctx, chatId, photo, extra) {
    return ctx.telegram.sendPhoto(chatId, photo, extra)
}

/**
 * Returns a method to send an animation
 * @param {The context to use} ctx 
 */
function send_animation(ctx, chatId, animation, extra) {
    return ctx.telegram.sendAnimation(chatId, animation, extra)
}

function any_media_id(message) {
    if (has_photo(message)) return photo_id(message)
    if (has_animation(message)) return animation_id(message)
    return null
}

/**
 * Saves memes to the db, forwards them and handles upvoting
 * @param {The telegraph message context} ctx 
 * @param {A callback used to find the file id of the media in that message} file_id_callback 
 */
function handle_media_message(ctx, file_id_callback, send_media) {
    ctx.reply('👍')
    console.log(ctx.message)
    con.connect(function (err) {
        if (err) console.log(err);
        console.log()

        //insert photo and publisher in database
        var file_id = file_id_callback(ctx.message)
        var user_id = ctx.message.from.id
        var sql = "INSERT INTO memes (UserID, photoID) VALUES ( '" + user_id + "','" + file_id + "')";
        con.query(sql, function (err, result) {
            if (err&&err.sqlMessage.includes('photoID')) {
                ctx.telegram.sendMessage(user_id,'REPOST DU SPAST!'); 
            }else if(err){
                console.log(err);
            } 
            //send the meme to Memehub with inlinekeyboard
            send_media(
                ctx,
                group_id,
                file_id, 
                { 
                    caption: "@" + ctx.message.from.username, 
                    reply_markup: { 
                        inline_keyboard: [[{ text: "👍", callback_data: "upvote" }]] 
                    } 
                }
            ); //, { text: "👎", callback_data: "downvote" } 
        });
    });
}



//do this on an callback query
bot.on('callback_query', (ctx) => {
    let file_id = any_media_id(ctx.update.callback_query.message)
    let upvotes;
    let user=ctx.update.callback_query.from.id;
    console.log(ctx.update)
    switch (ctx.update.callback_query.data) {
        case "upvote":
            con.connect(function (err) {
                if (err) console.log(err);
                var sql = "INSERT INTO votes (userID, photoID, vote) VALUES ('" + user + "','" + file_id + "', true) ON DUPLICATE KEY UPDATE vote = !vote;";
                console.log(sql);
                con.query(sql, function (err, result) {
                    if (err) console.log(err);
                    console.log("1 record inserted");
                });
                var sql = "select sum(vote) as upvotes  from votes where photoID='" + file_id + "';";
                con.query(sql, function (err, result) {
                    if (err) console.log(err);
                    console.log(result[0].upvotes);
                    upvotes=result[0].upvotes;
                    ctx.editMessageReplyMarkup({inline_keyboard: [[{ text: "👍 - " + upvotes, callback_data: "upvote" }]]});
                    ctx.answerCbQuery();
                });
            });           
            break;       
        default:        
            ctx.answerCbQuery();
            break;
    }

})

module.exports = bot

// zeigt das Meme mit den meisten Upvotes an 
bot.command('stats', (ctx) => {
    let user_id = ctx.message.from.id;
    let photo;
    let chatId;
    let extra;
    let max_upvotes;
    
    //ctx.reply(user_id);
    //var sql = "SELECT photoID as photo, vote from test.votes where userID = '"+ user_id + "' order by vote desc;";// sql Auruf bei dem für den Benutzer das Bild mit den meisten Upvotes geholt wird
    var sql = "Create or Replace view Statistik as select m.photoID as meme, count(v.vote) as upvotes from test_statistik.memes m Inner join test_statistik.votes v on (m.photoID = v.photoID) where m.userID= '"+ user_id + "' group by m.photoID;"; 
    con.query(sql, function (err, result) {
        if (err) console.log(err);
        console.log(sql)

        })
        var sql_ = "Select meme as meme, max(upvotes) as upvotes from Statistik;";
    
    con.query(sql_, function (err, result) {
            if (err) console.log(err);
            
            console.log(result[0].meme);
            console.log(result[0].upvotes);
            console.log(sql_)
            photo=result[0].meme
            max_upvotes=result[0].upvotes
            console.log(photo)
            
            
            chatId=ctx.message.chat.id;
            
            console.log(chatId);
            send_photo(ctx,chatId,photo,extra);
            ctx.telegram.sendMessage(chatId,'Wir präsentieren: Dein Meme mit den meisten Upvotes -> ' + max_upvotes);
            //sendPhoto(chatId, photo)
           
    })
})

// zeigt durchschnittlichen Upvotes an 
bot.command('avg', (ctx) => {
    let user_id = ctx.message.from.id;
    let photo;
    let chatId;
    let extra;
    let avg;

    var sql = "Create or Replace view Statistik as select m.photoID as meme, count(v.vote) as upvotes from test_statistik.memes m Inner join test_statistik.votes v on (m.photoID = v.photoID) where m.userID= '"+ user_id + "' group by m.photoID;"; 
    con.query(sql, function (err, result) {
        if (err) console.log(err);
        console.log(sql)
        })

    var sql_ = "Select round(avg(upvotes),2) as average from Statistik;";
    con.query(sql_, function (err, result) {
        avg = result[0].average;
        chatId=ctx.message.chat.id;
            
            console.log(chatId);
            ctx.telegram.sendMessage(chatId,'Dein Upvote-Average (all-time): ' + avg);
    })
})

// zeigt memer mit deren Anzahl an Uploads an ( aber noch ohne Name nur mit userID)
bot.command('meme_sum', (ctx) => {
    let user_id = ctx.message.from.id;
    let chatId;
    let extra;
    let id;
   
    chatId=ctx.message.chat.id;
    let sum;
    
    var sql = "Select userID, count(photoID) as meme_sum from memes group by userID order by meme_sum desc;"; 
    con.query(sql, function (err, result) {
        if (err) console.log(err);
        console.log(sql)
        
        for (i=0;i<result.length;i++){
            sum = result[i].meme_sum;
            id = result[i].userID;
            console.log(sum);
            ctx.telegram.sendMessage(chatId,'Platz ' + (i+1) +': ' + sum +'       Memer: @'+ id);
        }


       
    })    
           
            
})

    
    
   