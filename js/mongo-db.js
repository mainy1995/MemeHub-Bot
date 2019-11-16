const util = require('./util');
const log = require('./log');
const _config = require('./config');
const maintain = require('./meme-maintaining');
const MongoClient = require('mongodb').MongoClient;

 let client;
 let memes;
 let users;
 let connection;
 let connected;
 let collection_names;

_config.subscribe('config', c => {
    init(c.mongodb.collection_names, c.mongodb.database, c.mongodb.connection_string);
});

function init(coll_names, db_name, connection_string) {
    collection_names = coll_names;
    if (connection) {
        log.info('Disconnecting from mongo db', 'config has changed');
        connection.close();
    }

    client = new MongoClient(connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    connected = new Promise((resolve, reject) => {
        client.connect(async (err, con) => {
            if (err) {
                log.error("Cannot connect to mongo db", err);
                reject(err);
            }
            
            connection = con;
            const db = client.db(db_name);
            
            var collections = await Promise.all([
                db.createCollection(collection_names.memes), 
                db.createCollection(collection_names.users)
            ]);
            
            memes = collections[0];
            users = collections[1];
            log.success('Connected to mongodb');
            resolve();
        });
    });
}

/**
 * Saves a user in the database.
 * @param {The user to save} user 
 */
function save_user(user) {
    users.updateOne(
        { _id: user.id },
        { $set: {
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        }},
        { upsert: true }
    ).catch((err) => log.error("Cannot save user in mongo db", { error: err, user}))
    .then((result) => {
        // Check, if username is new
        if (result.modifiedCount == 1 && result.matchedCount == 1) {
            log.info('Detected username change. Updating old posts', user);
            maintain.update_user_name(user);
        }
    });
}

/**
 * Saves a meme to the database.
 * @param {The id of the user how send the meme} user_id 
 * @param {The file id of the meme} file_id 
 * @param {The id of the message from the user} message_id 
 * @param {The category of the meme} category 
 */
function save_meme(user_id, file_id, file_type, message_id, category, group_message_id = null, post_date = new Date()) {
    return new Promise((resolve, reject) => {
        memes.insertOne({
            _id: file_id,
            type: file_type,
            poster_id: user_id,
            private_message_id: message_id,
            group_message_id: group_message_id,
            category: category,
            votes: {},
            post_date: post_date
        })
        .then(resolve)
        .catch((error) => {
            log.error("Cannot save meme in mongo db", { error, request: { user_id, file_id, file_type, message_id, category, group_message_id, post_date }});
            reject(error);
        });
    });
}

/**
 * Saves the message id of a recently send message. This is supposed to be used after sending a meme to the meme group.
 * @param {The message context that got returned from the message to the meme group} ctx 
 */
function save_meme_group_message(ctx) {
    let file_id = util.any_media_id(ctx);
    if (!file_id) {
        log.error("Cannot store group message id in mongo db", "missing file id");
        return;
    }
    memes.updateOne(
        { _id: file_id },
        { $set: { group_message_id: ctx.message_id }}
    )
    .catch((error) => {
        log.error("Cannot store group message id in mongo db", { error, file_id });
    });
}

async function save_vote(user_id, file_id, vote_type) {
    const vote_path = `votes.${vote_type}`;
    let find = {};
    find['_id'] = file_id;
    find[vote_path] = user_id;
    
    try {
        const meme = await memes.findOne(find);
        let toggle = {}
        toggle[vote_path] = user_id;

        if (meme) {
            await memes.updateOne({ _id: file_id }, { $pull: toggle });
            return;
        }
        await memes.updateOne({ _id: file_id }, { $addToSet: toggle });
    }
    catch (error) { 
        log.error("Cannot save vote in mongo db", { error, request: { user_id, file_id, vote_type } }); 
    }
    
}

async function* get_memes_by_user(user_id, options, include_reposts) {
    if (!options) options = {};
    try {
        const result = include_reposts
            ? await memes.find({ poster_id: user_id }, options)
            : await memes.find({ poster_id: user_id, isRepost: { $exists: false } });

        while (await result.hasNext()) {
            yield await result.next();
        }
    }
    catch (error) { 
        log.error("Cannot get memes by user from mongo db", { error, request: { user_id, options } });
        throw error;
    }
}

async function count_votes(file_id) {
    try {
        const meme = await memes.findOne({ _id: file_id });       
        if (!meme) throw "meme not found";
        if (!meme.votes) return [];

        const votes = {}
        for (type of Object.keys(meme.votes)) {
            votes[type] = meme.votes[type].length;
        }
        
        return votes;
    }
    catch (error) { 
        log.error("Cannot count votes in mongo db", { error, request: { file_id }});
        throw error;
    }
}

async function count_user_total_votes_by_type(user_id, vote_type) {
    try {
        const cursor = await memes.aggregate([
            { $match: { poster_id: user_id }},
            { $project: {
                _id: false,
                votes_of_type: `$votes.${vote_type}`
            }},
            { $unwind: "$votes_of_type" },
            { $count: "upvotes" }
        ]);
        const result = await cursor.next();

        if (!result) return 0;
        return result.upvotes;
    }
    catch(error) {
        log.error("Cannot count user total votes by type in mongo db", { error, request: { user_id, vote_type }});
        throw error;
    }
}

function get_user_top_meme(user_id) {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            { $match: { 
                poster_id: user_id,
                'votes.like': { $exists: true }
            }},
            { $project: {
                _id: false,
                media_id: "$_id",
                upvotes: { $size: "$votes.like" },
                type: true
            }},
            { $sort: { upvotes: -1 } }
        ], {}, (err, cursor) => {
            if (err) {
                reject(err);
                return;
            }

            cursor.next((err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve(result);
            });
        });
    });
}

function get_user_from_meme(file_id) {
    return new Promise((resolve, reject) => {
        memes.findOne({ _id: file_id })
            .then(meme => {
                if (!meme || !meme.poster_id) {
                    reject();
                    return;
                }

                resolve(meme.poster_id);
            })
    })
}

async function get_user(user_id) {
    const user = await users.findOne({ _id: user_id});
    user.id = user._id;
    return user;
}

function get_user_average_upvotes(user_id) {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            { $match: { 
                poster_id: user_id,
                'votes.like': { $exists: true }
            }},
            { $project: {
                upvotes: { $size: "$votes.like" }
            }},
            { $group: { 
                _id: "$poster_id",
                average_upvotes: { $avg: "$upvotes" }
             }}
        ], {}, (err, cursor) => {
            if (err) {
                reject(err);
                return;
            }
            
            cursor.next((err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                if(!result) {
                    resolve(0);
                    return;
                }

                resolve(result.average_upvotes);
            });
        });
    });
}

function get_user_meme_count(user_id) {
    return new Promise((resolve, reject) => {
        memes.countDocuments({ poster_id: user_id }, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            
            resolve(data);
        });
    });
}

async function get_user_meme_counts(limit = 5) {
    const result = await memes.aggregate([
        { $group: { 
            _id: "$poster_id",
            memes: { $sum: 1 }
        }},
        { $sort: { memes: -1 }},
        { $limit: limit },
        { $lookup: {
            from: collection_names.users,
            localField: "_id",
            foreignField: "_id",
            as: "users"
        }},
        { $replaceRoot: {
                newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$users", 0 ] }, "$$ROOT" ] } 
        }},
        { $project: { users: 0 } }
    ]);
    return result.toArray();
}

async function save_repost(message_id) {
    try {
        const meme = await memes.findOne({ group_message_id: message_id});

        if (!meme) {
            log.error("Cannot flag meme as repost, as it does not exist", { message_id });
        }
        
        await memes.updateOne({group_message_id: message_id },{ $set:{ isRepost: true}});
    }
    catch (error) {
        log.error("Cannot save repost flag", { error, request: { message_id } });
    }
}

module.exports.init = init;
module.exports.save_user = save_user;
module.exports.save_meme = save_meme;
module.exports.save_meme_group_message = save_meme_group_message;
module.exports.save_vote = save_vote;
module.exports.get_memes_by_user = get_memes_by_user;
module.exports.count_votes = count_votes;
module.exports.get_user_top_meme = get_user_top_meme;
module.exports.get_user_average_upvotes = get_user_average_upvotes;
module.exports.get_user_meme_counts = get_user_meme_counts;
module.exports.get_user_meme_count = get_user_meme_count;
module.exports.get_user_from_meme = get_user_from_meme;
module.exports.count_user_total_votes_by_type = count_user_total_votes_by_type;
module.exports.connected = connected;
module.exports.get_user = get_user;
module.exports.save_repost= save_repost;