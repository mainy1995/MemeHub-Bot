const Telegraf = require('telegraf');
const config = require('./config/config.json');
const mha_config = require('./config/mha.json');
const MongoClient = require('mongodb').MongoClient;
const uuidv4 = require('uuid/v4');
const fs = require('fs');
const https = require('https');

if (process.argv[2] === 'users') {
    export_users();
}
if (process.argv[2] === 'nominees') {
    export_nominees();
}

async function export_nominees() {
    console.log('Exporting nominees...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    console.log('Connectet!');

    await fs.promises.mkdir(mha_config.nominees.image_path, { recursive: true });
    const bot = new Telegraf(config.bot_token);
    const users = await get_users(db);
    const nominees = {};
    const collection = db.collection(config.mongodb.collection_names.memes);
    for (category of mha_config.nominees.categories) {

        console.log(`Getting memes of category ${category}...`);
        const votes_field = category == "Weeb" ? "$votes.weeb" : "$votes.like";
        const match = { category };
        match[`votes.${category == 'Weeb' ? 'weeb' : 'like'}`] = { $exists: true };
        const result = await collection.aggregate([
            { $match: match },
            {
                $project: {
                    id: '$_id',
                    user_id: '$poster_id',
                    votes: { $size: votes_field },
                    _id: false
                }
            },
            { $sort: { votes: -1 } },
            { $limit: 10 },
            {
                $project: {
                    id: 1,
                    user_id: 1
                }
            }
        ]);

        const memes = await result.toArray();
        const with_download = [];
        for (const meme of memes) {
            try {
                const file = await download_image(bot, meme.id);
                with_download.push({
                    id: meme.id,
                    file,
                    user: users.find(u => u.id == meme.user_id).name
                })
            }
            catch (err) {
                console.error("failed downloading file!");
                console.error(err);
            }
        }
        nominees[`#${category}`] = with_download;
        console.log(`Got ${nominees[`#${category}`].length} Nominees for ${category}!`);
    }
    fs.writeFile(mha_config.nominees.nominees_path, JSON.stringify(nominees, null, '  '), err => {
        if (err) throw err;
        console.log('Done!');
    });
}

async function export_users() {
    console.log('Exporting users...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    console.log('Connectet!');

    const users = await get_users(db);
    const final_object = {};
    users.forEach(user => final_object[uuidv4()] = user);

    console.log('Writing to file...');
    fs.writeFile(mha_config.users.path, JSON.stringify(final_object, null, '  '), err => {
        if (err) throw err;
        console.log('Done!');
    });
}

async function get_users(db) {
    const collection = db.collection(config.mongodb.collection_names.users);
    console.log('Getting all users...');
    const result = collection.aggregate([
        { $match: {} },
        {
            $project: {
                id: '$_id',
                name: '$first_name',
                _id: false
            }
        }
    ]);

    const users = await result.toArray();
    console.log(`Got ${users.length} users!`);
    return users;
}

async function download_image(bot, id) {
    const file_data = await bot.telegram.getFile(id);
    const file_type = get_file_type(file_data, id);
    if (!['jpg', 'png', 'mp4', 'gif'].includes(file_type)) throw 'unknown file type! ' + file_data.file_path;
    const local_file_path = `${mha_config.nominees.image_path}/${id}.${file_type}`
    const local_file = fs.createWriteStream(local_file_path);
    const result = await doRequest(`https://api.telegram.org/file/bot${config.bot_token}/${file_data.file_path}`);
    result.pipe(local_file);
    return `${mha_config.nominees.image_prefix}${id}.${file_type}`;
}

function get_file_type(file_data, id) {
    const segments = file_data.file_path.split('.');
    if (segments.length < 2) {
        console.error(`No file extension found for meme "${id}"! using jpg.`);
        return "jpg";
    }
    return segments.slice(-1)[0];
}

async function doRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url);
        req.on('response', res => {
            resolve(res);
        });

        req.on('error', err => {
            reject(err);
        });
    });
}