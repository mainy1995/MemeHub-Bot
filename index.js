const { Composer, log, session } = require('micro-bot')
var mysql = require('mysql');

//Read SQL Connection from console
const mysql_password = process.env.MYSQL_PASSWORD
if (!mysql_password) {
    console.error(`μ-bot: Please supply MYSQL_PASSWORD`)
    process.exit(1)
}
const mysql_host = process.env.MYSQL_HOST
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
    return message.photo[message.photo.length - 1].file_id
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


function save_user(user) {
    var sql = "REPLACE INTO user (UserID, Username, Vorname, Nachname) VALUES ( '" + user.id + "','" + user.username + "','" + user.first_name + "','" + user.last_name + "');";
    console.log("=========================SAVE USER SQL QUERY===========================")
    console.log(sql)
    console.log(user)
    con.query(sql, function (err, result) {
        if (err) {
            console.log("=========================SQL QUERY===========================")
            console.log(sql)
            console.log(err);
        }
    });
}
function conOpen(con, callback) {
    switch (con.state) {
        case 16:
            con.end(function (err) {
                if (err) {
                    console.log("=========================SQL CON END===========================")
                    console.log(sql)
                    console.log(err);
                }

            });
            con.connect(function (err) {
                if (err) {
                    console.log("=========================SQL CON START===========================")
                    console.log(sql)
                    console.log(err);
                }
                callback();
            });
            break;
        case 0:
            con.connect(function (err) {
                if (err) {
                    console.log("=========================SQL CON START===========================")
                    console.log(sql)
                    console.log(err);
                }
                callback();
            });
            break;
        default:
            callback();
            break;
    }
}
/**
 * Saves memes to the db, forwards them and handles upvoting
 * @param {The telegraph message context} ctx 
 * @param {A callback used to find the file id of the media in that message} file_id_callback 
 */
function handle_media_message(ctx, file_id_callback, send_media) {
    var user = ctx.message.from
    if (!user.username) {
        ctx.reply('Posting without username not allowed! Set your username in settings.')
    } else {
        ctx.reply('👍')
        console.log("=======================HANDLE MEDIA=======================")
        console.log(ctx.message)
        conOpen(con, function () {
            //insert photo and publisher in database
            var file_id = file_id_callback(ctx.message)
            if (!user.is_bot) {
                save_user(user);
            }
            var sql = "INSERT INTO memes (UserID, photoID,privMessageID,categorie ) VALUES ( '" + user.id + "','" + file_id + "','" + ctx.message.message_id + "','" + ctx.message.caption + "')";
            con.query(sql, function (err, result) {
                if (err && err.sqlMessage.includes('photoID')) {
                    ctx.telegram.sendMessage(user.id, 'REPOST DU SPAST!');
                } else if (err) {
                    console.log("=========================SQL QUERY===========================")
                    console.log(sql)
                    console.log(err);
                }
                //send the meme to Memehub with inlinekeyboard
                send_media(
                    ctx,
                    group_id,
                    file_id,
                    {
                        caption: "@" + user.username + " | #" + ctx.message.caption,
                        reply_markup: {
                            inline_keyboard: [[{ text: "👍", callback_data: "upvote" }]]
                        }
                    }
                ).then((ctx) => {
                    console.log("=========================SEND MEDIA CALLBACK===========================")
                    console.log(ctx)
                    conOpen(con, function () {
                        var sql = "UPDATE memes set groupMessageID='" + ctx.message_id + "' where photoID='" + photo_id(ctx) + "' ;";
                        console.log(sql);
                        con.query(sql, function (err, result) {
                            if (err) {
                                console.log("=========================SQL QUERY===========================")
                                console.log(sql)
                                console.log(err);
                            }
                        })
                    });
                });
            });
        })
    }

}




//do this on an callback query
//do this on an callback query
bot.on('callback_query', (ctx) => {
    let file_id = any_media_id(ctx.update.callback_query.message)
    let upvotes;
    let user = ctx.update.callback_query.from;
    console.log("=======================UPVOTE CALLBACK QUERY=======================")
    console.log(ctx.update)
    if (!ctx.update.callback_query.from.is_bot) {
        save_user(ctx.update.callback_query.from);
    }
    switch (ctx.update.callback_query.data) {
        case "upvote":
            conOpen(con, function () {
                var sql = "INSERT INTO votes (userID, photoID, vote) VALUES ('" + user.id + "','" + file_id + "', true) ON DUPLICATE KEY UPDATE vote = !vote;";
                con.query(sql, function (err, result) {
                    if (err) {
                        console.log("=========================SQL QUERY===========================")
                        console.log(sql)
                        console.log(err);
                    }
                });
                var sql = "select sum(vote) as upvotes  from votes where photoID='" + file_id + "';";
                con.query(sql, function (err, result) {
                    if (err) {
                        console.log("=========================SQL QUERY===========================")
                        console.log(sql)
                        console.log(err);
                    }
                    upvotes = result[0].upvotes;
                    ctx.editMessageReplyMarkup({ inline_keyboard: [[{ text: "👍 - " + upvotes, callback_data: "upvote" }]] });
                    ctx.answerCbQuery();
                });
            });
            break;
        default:
            ctx.answerCbQuery();
            break;
    }

})

// zeigt mein Meme mit den meisten Upvotes an 
bot.command('stats', (ctx) => {
    let user_id = ctx.message.from.id;  
    let photo, max_upvotes
    let chatId = ctx.message.chat.id;
    let extra;
    conOpen(con, function () {        
        var sql = "Select photoID, max(upvotes) as upvotes from Statistik where UserID='"+user_id +"';";    
        con.query(sql, function (err, result) {
            if (err) console.log(err);                
            photo = result[0].meme
            max_upvotes = result[0].upvotes
            console.log(chatId);
            send_photo(ctx, chatId, photo,extra);
            ctx.telegram.sendMessage(chatId, 'Wir präsentieren: Dein Meme mit den meisten Upvotes -> ' + max_upvotes);
            //sendPhoto(chatId, photo)
    
        })
    })
   
})

// zeigt durchschnittliche Upvotes auf meine Memes an 
bot.command('avg', (ctx) => {
    let user_id = ctx.message.from.id;    
    let chatId= ctx.message.chat.id;    
    let avg;
    conOpen(con, function(){       
        var sql_ = "Select round(avg(upvotes),2) as average from Statistik where UserID='"+user_id +"';";
        con.query(sql_, function (err, result) {
            avg = result[0].average;
            ctx.telegram.sendMessage(chatId, 'Dein Upvote-Average (all-time): ' + avg);
        })
    })
   
})
// zeigt memer mit deren Anzahl an Uploads an ( aber noch ohne Name nur mit userID)
bot.command('meme_sum', (ctx) => {
    let chatId= ctx.message.chat.id;
    let sum='';
    conOpen(con, function(){
        var sql = "Select *  from MemeAnzahl order by meme_sum desc;";
        con.query(sql, function (err, result) {
            if (err) console.log(err);
                
            for (i = 0; i < result.length; i++) {
                sum+='Platz ' + (i + 1) + ': ' + result[i].meme_sum + (result[i].Username!=null? '       Memer: @' + result[i].Username:'       UserID: ' + result[i].UserID)+'\n'
            }
            ctx.telegram.sendMessage(chatId, sum);
    
    
    
        })
    })
    


})



module.exports = bot