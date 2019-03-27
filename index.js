const { Composer, log, session } = require('micro-bot')

const bot = new Composer()
up=0
down=0

bot.use(log())
bot.use(session())
bot.start(({ reply }) => reply('Welcome message'))
bot.help(({ reply }) => reply('Help message'))
bot.settings(({ reply }) => reply('Bot settings'))
bot.on('photo', (ctx)=>{
    ctx.reply('👍')
    console.log(ctx.message)
    ctx.telegram.sendPhoto('-1001370542972', ctx.message.photo[3].file_id,{caption:"@"+ctx.message.from.username, reply_markup:{inline_keyboard:[[{text:"👍",callback_data:"upvote"},{text:"👎",callback_data:"downvote"}]]}})
})
bot.on('callback_query', (ctx)=>{       
    console.log(ctx.update)
    switch (ctx.update.callback_query.data) {
        case "upvote":
        up+=1     
            break;
        case "downvote":      
        down+=1
            break;
        default:
            break;
    }
    ctx.editMessageReplyMarkup({inline_keyboard:[[{text:"👍 - "+up,callback_data:"upvote"},{text:"👎 - "+down,callback_data:"downvote"}]]})
    ctx.answerCbQuery()

})
bot.command('date', ({ reply }) => reply(`Server time: ${Date()}`))

module.exports = bot
