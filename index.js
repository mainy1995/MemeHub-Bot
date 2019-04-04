const { Composer, log, session } = require('micro-bot')
var mysql = require('mysql');

//Read SQL Connection from console
const mysql_password =  process.env.MYSQL_PASSWORD
if (!mysql_password) {
  console.error(`μ-bot: Please supply Mysql password`)
  process.exit(1)
}
const mysql_host =  process.env.MYSQL_HOST
if (!mysql_host) {
  console.error(`μ-bot: Please supply Mysql Host`)
  process.exit(1)
}

//Create SQL Connection
var con = mysql.createConnection({
    host: mysql_host,
    user: "MemehubBOT",
    password: mysql_password,
    database: "Memehub"
});

const bot = new Composer()

bot.use(log());
bot.use(session());

//replay to /start
bot.start(({ reply }) => reply('Welcome message'));

//replay to /help
bot.help(({ reply }) => reply('Help message'));

//replat on /date
bot.command('date', ({ reply }) => reply(`Server time: ${Date()}`))


//replay to /setting
bot.settings(({ reply }) => reply('Bot settings'));

//do this if photo is sent
bot.on('photo', (ctx) => {
    ctx.reply('👍')
    console.log(ctx.message)
    con.connect(function (err) {
        if (err) console.log(err);
        console.log()

        //insert photo and publisher in database pick the photoid with the highest resolution
        var sql = "INSERT INTO Memehub.memes (UserID, photoID) VALUES ( '"+ctx.message.from.id +"','"+ctx.message.photo[ctx.message.photo.length-1].file_id+"')";
        con.query(sql, function (err, result) {
            if (err&&err.sqlMessage.includes('photoID')) {
                ctx.telegram.sendMessage(ctx.message.from.id,'REPOST DU SPAST!'); 
            }else if(err){
                console.log(err);
            } 
            //send photo to Memehub with inlinekeyboard  
            //hier id für die gruppe eintragen        
            ctx.telegram.sendPhoto('-1001324535695', ctx.message.photo[ctx.message.photo.length-1].file_id, { caption: "@" + ctx.message.from.username, reply_markup: { inline_keyboard: [[{ text: "👍", callback_data: "upvote" }]] } }); //, { text: "👎", callback_data: "downvote" }
            
        });
    });
})


//do this on an callback query
bot.on('callback_query', (ctx) => {
    let photoID=ctx.update.callback_query.message.photo[ctx.update.callback_query.message.photo.length-1].file_id;
    let upvotes;
    let user=ctx.update.callback_query.from.id;
    console.log(ctx.update)
    switch (ctx.update.callback_query.data) {
        case "upvote":
            con.connect(function (err) {
                if (err) console.log(err);
                var sql = "INSERT INTO Memehub.votes (userID, photoID, vote) VALUES ('"+user+"','"+photoID+"', true) ON DUPLICATE KEY UPDATE vote = !vote;";
                console.log(sql);
                con.query(sql, function (err, result) {
                    if (err) console.log(err);
                    console.log("1 record inserted");
                });
                var sql = "select sum(vote) as upvotes  from Memehub.votes where photoID='"+photoID+"';";
                con.query(sql, function (err, result) {
                    if (err) console.log(err);
                    console.log(result[0].upvotes);
                    upvotes=result[0].upvotes;
                    ctx.editMessageReplyMarkup({inline_keyboard: [[{ text: "👍 - "+upvotes,callback_data:"upvote"}]]});
                    
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
