const Scene = require('telegraf/scenes/base');
const scenes = require('../../../data/scenes.json').contest;

/**
 * Scene to list contests
 * @param {*} scenes 
 * @param {*} keyboard 
 * @param {*} clients 
 */
module.exports.build = function (clients) {

    const scene = new Scene(scenes.LIST);
    scene.enter(async ctx => {
        try {
            const contests = await clients.list.request({});
            if (!contests || !contests.length)
                return await ctx.reply("There aren't any contests right now");

            let text = contests.length === 1
                ? 'There is one contest:'
                : `There are ${contests.length} contests:`

            for (const contest of contests) {
                text += `\n\nID: ${contest.id}\nTag: #${contest.tag}\nEmoji: ${contest.emoji}\nRunning: ${contest.running ? "yes" : "no"}`;
            }

            await ctx.reply(text);
        }
        catch (error) {
            await ctx.reply('Something went wrong, sorry!');
        }
        finally {
            ctx.scene.enter(scenes.MENU);
        }
    });
    return scene;
}