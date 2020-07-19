const Scene = require('telegraf/scenes/base');
const Keyboard = require('telegraf-keyboard');
const posting = require('../../meme-posting');
const scenes = require('../../../data/scenes.json').categories;
const log = require('../../log');
const db = require('../../mongo-db');

let contestsRunning = [];
let categories = [];
let maximum = 1;
let columns = 4;

module.exports.setContests = _contests => contestsRunning = _contests;
module.exports.setCategories = _categories => categories = _categories;
module.exports.setMaximum = _maximum => maximum = _maximum;
module.exports.setColumns = _columns => columns = _columns;
module.exports.build = function (clients) {

    const emoji_ok = '✅';
    const emoji_no = '❌';

    const scene = new Scene(scenes.SELECT);
    scene.enter(start);
    scene.leave(cleanUp);
    scene.hears(emoji_ok, done);
    scene.hears(emoji_no, abort);
    scene.on('message', receive);


    async function start(ctx) {
        await ctx.reply("Pick a category or type one in 👇", buildCategoryKeyboard(ctx));
    }

    async function receive(ctx) {
        try {
            const categories = await clients.validateCategories.request(ctx.message.text.split(' '));
            // Check if is valid category
            if (categories.length < 1) {
                ctx.reply("That is 🚫not🚫 a valid category. Try again 👇", buildCategoryKeyboard(ctx));
                return;
            }

            // Deselect or select categoires
            for (const category of categories) {
                const index = ctx.session.categories.selected.indexOf(category);

                if (index > -1) {
                    ctx.session.categories.selected.splice(index, 1);
                    await ctx.reply(`🗑️ Removing #${category}`, buildCategoryKeyboard(ctx));
                }
                else {
                    ctx.session.categories.selected.push(category);
                    await ctx.reply(`✨ Adding #${category}`, buildCategoryKeyboard(ctx));
                }
            }

            if (ctx.session.categories.selected.length > maximum) {
                await ctx.reply(`❗ That's more than the maximum of ${maximum} categories. Remove some before finishing.`);
            }
        }
        catch (error) {
            await ctx.reply("Sorry, something went wrong", { reply_markup: { remove_keyboard: true } });
            log.error("Cannot handle provided category", error);
            ctx.scene.leave();
        }
    }

    async function done(ctx) {
        if (ctx.session.categories.selected.length > maximum) {
            ctx.reply(`🚨🚨🚨 That's more categories than allowed! 🚨🚨🚨\nPlease remove some until you have ${maximum} or less categories.`);
            return;
        }

        try {
            // Update categoreis and contest in db 
            const categoreisWithContest = ctx.session.categories.selected.filter(cat => contestsRunning.some(cont => cont.tag === cat));
            if (categoreisWithContest.length > 0)
                await db.save_meme_contests(ctx.session.categories.meme_id, categoreisWithContest);

            await clients.setCategories.request({
                meme_id: ctx.session.categories.meme_id,
                categories: ctx.session.categories.selected,
                validate: false
            });

            if (ctx.session.categories.post_afterward)
                await posting.post_meme(ctx.session.categories.meme_id);

            ctx.reply(`${emoji_ok} Done`, { reply_markup: { remove_keyboard: true } });
        }
        catch (error) {
            log.warning('Failed to save meme categories', { error: serializeError(error), session: ctx.session.categories });
            ctx.reply("💥 I could not update your categories, sorry!", { reply_markup: { remove_keyboard: true } });
        }
        finally {
            ctx.scene.leave();
        }
    }

    function abort(ctx) {
        try {
            if (ctx.session.categories.post_afterward)
                ctx.reply(`${emoji_no} Okay, not posting your meme!`, { reply_markup: { remove_keyboard: true } });
            else
                ctx.reply(`${emoji_no} Okay, not updating categories`, { reply_markup: { remove_keyboard: true } });
        }
        catch (error) {
            ctx.reply("💥 Something went wrong!", { reply_markup: { remove_keyboard: true } });
            log.error("Error while aborting category stage", error);
        }
        finally {
            ctx.scene.leave();
        }
    }

    function cleanUp(ctx) {
        ctx.session.categories = undefined;
    }

    function buildCategoryKeyboard(ctx) {
        const keyboard = new Keyboard();
        try {
            const options = categories.map(c => ctx.session.categories.selected.includes(c) ? `[ #${c} ]` : `#${c}`);
            const contests = contestsRunning.map(c => ctx.session.categories.selected.includes(c.tag) ? `[ #${c.tag} ${c.emoji} ]` : `#${c.tag} ${c.emoji}`);
            options.unshift(...contests);
            options.unshift(emoji_ok, emoji_no);
            options.push(...ctx.session.categories.selected
                .filter(c =>
                    !categories.includes(c) &&
                    !contestsRunning.some(contest => contest.tag === c)
                ).map(c => `[ #${c} ]`));
            for (let i = 0; i < options.length; i += columns) {
                keyboard.add(options.slice(i, i + columns));
            }
        }
        catch (error) {
            log.error('Cannot build category keyboard', error);
        }
        return keyboard.draw();
    }


    return scene;

}