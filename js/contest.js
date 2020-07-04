const { serializeError } = require('serialize-error');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const Session = require('telegraf/session');
const Keyboard = require('telegraf-keyboard');

const _bot = require('./bot');
const util = require('./util');
const log = require('./log');
const _config = require('./config');
const db = require('./mongo-db');
const admins = require('./admins');


let stage = new Stage();
let clients = {};
_config.subscribe('rrb', rrb => {

});
_bot.subscribe(bot => {
    bot.use(Session());
    bot.use(stage.middleware());
    bot.command('contest_create', command_create);
    bot.command('contest_start', command_start);
    bot.command('contest_edit', command_edit);
    bot.command('contest_list', command_list);
    bot.command('contest_stop', command_stop);
    bot.command('contest_delete', command_delete);
});

async function start(rrb) {

}

async function stop() {

}

async function command_create(ctx) {

}

async function command_start(ctx) {

}

async function command_edit(ctx) {

}

async function command_list(ctx) {

}

async function command_stop(ctx) {

}

async function command_delete(ctx) {

}