const Telegraf = require('telegraf');
const config = require('./config/config.json');
const mha_config = require('./config/mha.json');
const MongoClient = require('mongodb').MongoClient;
const uuidv4 = require('uuid/v4');
const fs = require('fs');
const https = require('https');
const CsvReadableStream = require('csv-reader');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

if (process.argv[2] === 'users') {
    export_users();
}
if (process.argv[2] === 'nominees') {
    export_nominees();
}
if (process.argv[2] === 'media') {
    export_media();
}
if (process.argv[2] === 'broadcast') {
    broadcast();
}
if (process.argv[2] === 'mentions') {
    mentions();
}
if (process.argv[2] === 'evaluate') {
    evaluate();
}

async function export_nominees() {
    console.log('Exporting nominees...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    console.log('Connectet!');

    const nominees = {};
    const collection = db.collection(config.mongodb.collection_names.memes);
    for (category of mha_config.nominees.categories) {
        console.log(`Getting memes of category ${category}...`);
        const votes_field = category == "Weeb" ? "$votes.weeb" : "$votes.like";
        const match = { categories: category };
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
        nominees[`#${category}`] = memes.map(meme => meme.id);
        console.log(`Got ${nominees[`#${category}`].length} Nominees for ${category}!`);
    }
    const json = JSON.stringify(nominees, null, '  ');
    for (const file of mha_config.nominees.nominees_paths) {
        await fs.promises.writeFile(file, json);
    }
    console.log('Done!');
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
    const json = JSON.stringify(final_object, null, '  ');
    for (const file of mha_config.users.paths) {
        await fs.promises.writeFile(file, json);
    }
    console.log('Done!');
}

async function export_media() {
    const bot = new Telegraf(config.bot_token);
    const nominees = require(mha_config.media.nominees_path);
    console.log(`Downloading media for ${Object.keys(nominees).length} nominees...`);
    await fs.promises.mkdir(mha_config.media.media_path, { recursive: true });
    const media = {}
    for (const category in nominees) {
        for (const id of nominees[category]) {
            try {
                media[id] = await download_image(bot, id);
            }
            catch (err) {
                console.error(`failed downloading file for id "${id}"`);
                console.error(err);
            }
        }
    }
    const json = JSON.stringify(media, null, '  ');
    for (file of mha_config.media.media_files) {
        await fs.promises.writeFile(file, json);
    }
    console.log("Done!");
}

async function broadcast() {
    const users = require("./config/users.json");
    const bot = new Telegraf(config.bot_token);
    for (token in users) {
        try {
            const id = users[token].id;
            await bot.telegram.sendMessage(id, `${mha_config.broadcast.message}${mha_config.broadcast.url_base}${token}`, { parse_mode: 'markdown' });
        }
        catch (err) {
            console.log('Cannot broadcast message.');
            console.log(err);
        }
    }
}

async function mentions() {
    console.log('Aggregating mentions...');
    console.log('Connecting to mongodb...');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    const mentions = require('./js/mentions');
    const memes = db.collection(config.mongodb.collection_names.memes);

    await mentions.most_voting(memes);
    await mentions.best_average(memes);
    await mentions.most_likes(memes);
    await mentions.most_memes(memes);
    await mentions.most_weeb_votes(memes);
    await mentions.most_oc(memes);
    await mentions.lowest_average_likes(memes);
    await mentions.best_meme(memes);
}

async function evaluate() {
    const inputStream = fs.createReadStream('report.csv', 'utf8');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    const memes = db.collection(config.mongodb.collection_names.memes);
    const csvWriter = createCsvWriter({
        path: 'report_enriched.csv',
        alwaysQuote: false,
        fieldDelimiter: ",",
        header: [
            { id: 'id', title: 'id' },
            { id: 'category', title: 'Kategorie' },
            { id: 'votes', title: 'Votes' },
            { id: 'user', title: 'User' },
            { id: 'likes', title: 'likes' },
            { id: 'weebs', title: 'weebs' }
        ]
    });
    const csv = [];
    inputStream
        .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
        .on('data', async function (row) {
            // console.log(row);
            if (row[0] === 'id') return;

            csv.push({
                id: row[0],
                category: row[1],
                votes: row[2],
            });
        })
        .on('end', async function () {
            for (const meme of csv) {
                const stats = await getMemeStats(memes, meme.id);
                meme.user = `@${stats.user.username}`;
                meme.likes = stats.likes;
                meme.weebs = stats.weebs;
            }
            await csvWriter.writeRecords(csv);
            console.log('done');
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
    const local_file_path = `${mha_config.media.media_path}${id}.${file_type}`
    const local_file = fs.createWriteStream(local_file_path);
    const result = await doRequest(`https://api.telegram.org/file/bot${config.bot_token}/${file_data.file_path}`);
    result.pipe(local_file);
    return `${mha_config.media.media_prefix}${id}.${file_type}`;
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

async function getMemeStats(memes, id) {
    const result = await memes.aggregate([
        {
            $match: {
                _id: id,
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'poster_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $replaceRoot: {
                newRoot: {
                    user: {
                        $arrayElemAt: ["$user", 0]
                    },
                    likes: {
                        $size: {
                            $ifNull: ["$votes.like", []]
                        }
                    },
                    weebs: {
                        $size: {
                            $ifNull: ["$votes.weeb", []]
                        }
                    }

                }
            }
        }
    ]);
    return await result.next();
}

