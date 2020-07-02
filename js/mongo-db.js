const util = require('./util');
const log = require('./log');
const _config = require('./config');
const maintain = require('./meme-maintaining');
const MongoClient = require('mongodb').MongoClient;
const lc = require('./lifecycle');

let client;
let memes;
let users;
let connection;
let connected;
let collection_names;
let config;

_config.subscribe('config', c => config = c.mongodb);

lc.on('start', async () => {
    init(config.collection_names, config.database, config.connection_string);
    await connected;
})

lc.on('stop', async () => {
    await connected;
    if (!connection) return;

    log.info('Disconnecting from mongo db');
    try {
        await connection.close();
    }
    catch (error) {
        console.log('failed to disconnect from mongodb', error);
    }
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
            log.info('Connected to mongodb');
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
        {
            $set: {
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            }
        },
        { upsert: true }
    ).catch((err) => log.error("Cannot save user in mongo db", { error: err, user }))
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
async function save_meme(user_id, file_id, file_unique_id, file_type, message_id, categories, group_message_id = null, post_date = new Date()) {
    try {
        const result = await memes.insertOne({
            _id: file_id,
            file_unique_id,
            type: file_type,
            poster_id: user_id,
            private_message_id: message_id,
            group_message_id: group_message_id,
            categories,
            votes: {},
            post_date: post_date
        });
        if (result.insertedCount !== 1) throw "Meme not inserted";
        return result.insertedId;
    }
    catch (error) {
        log.error("Cannot save meme in mongo db", { error, request: { user_id, file_id, file_type, message_id, categories, group_message_id, post_date } });
        throw error;
    }
}

module.exports.meme_id_get_by_group_message_id = async function (group_message_id) {
    const meme = await memes.findOne({ group_message_id }, { _id: 1 });
    if (!meme || !meme._id)
        throw { error: "Cannot find meme by group message id", group_message_id };
    return meme._id;
}

module.exports.meme_id_get_by_private_message_id = async function (private_message_id) {
    const meme = await memes.findOne({ private_message_id }, { _id: 1 });
    if (!meme || !meme._id)
        throw { error: "Cannot find meme by private message id", private_message_id };
    return meme._id;
}

async function save_meme_categories(id, categories) {
    const result = await memes.updateOne(
        { _id: id },
        { $set: { categories } }
    );
    if (result.matchedCount !== 1) {
        log.warning(`Faild saving categories for meme with id ${id}, matchedCount !== 1`, result)
        throw "Could not find meme";
    }
}

/**
 * Saves the message id of a recently send message. This is supposed to be used after sending a meme to the meme group.
 * @param {The message context that got returned from the message to the meme group} ctx
 */
module.exports.save_meme_group_message = async function (file_id, group_message_id) {
    if (!file_id)
        throw 'Cannot store group message id in mongo db, missing file id!';
    if (!group_message_id)
        throw 'Cannot store group message id in mongo db, missing group message id!';

    try {
        await memes.updateOne(
            { _id: file_id },
            { $set: { group_message_id: group_message_id } }
        );
    }
    catch (error) {
        throw { message: "Cannot store group message id in mongo db", error, file_id };
    };
}

/**
 * Saves a vote to the mongo db by either setting the vote or removing an existing one.
 * Returns 1 if the vote was added, -1 if the vote has been removed and 0 if the vote could not
 * be saved.
 */
module.exports.save_vote = async function save_vote(user_id, group_message_id, vote_type) {
    const vote_path = `votes.${vote_type}`;

    try {
        const meme = await memes.findOne({
            group_message_id,
            [vote_path]: user_id
        });

        const toggle = {
            [vote_path]: user_id
        };

        if (meme) {
            await memes.updateOne({ group_message_id }, { $pull: toggle });
            return -1;
        }
        await memes.updateOne({ group_message_id }, { $addToSet: toggle });
        return 1;
    }
    catch (error) {
        log.error("Cannot save vote in mongo db", { error, request: { user_id, file_id, vote_type } });
    }
    return 0;
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
        log.error("Cannot count votes in mongo db", { error, request: { file_id } });
        throw error;
    }
}

/**
 * Counts the votes for each vote type of a meme.
 */
module.exports.votes_count_by_group_message_id = async function (group_message_id) {
    try {
        const meme = await memes.findOne({ group_message_id });
        if (!meme) throw "meme not found";
        if (!meme.votes) return {};

        const votes = {}
        for (type in meme.votes) {
            votes[type] = meme.votes[type].length;
        }

        return votes;
    }
    catch (error) {
        log.error("Cannot count votes in mongo db", { error, request: { group_message_id } });
        throw error;
    }
}

module.exports.votes_includes_self_vote = async function (group_message_id, vote_type, poster_id) {
    try {
        const meme = await memes.findOne({ group_message_id, [`votes.${vote_type}`]: poster_id }, { fields: { votes: 1, poster_id: 1 } });
        if (!meme)
            return false;

        return true;
    }
    catch (error) {
        log.error("Cannot check votes in mongo db", { error, request: { group_message_id } });
        throw error;
    }
}

async function count_user_total_votes_by_type(user_id, vote_type) {
    try {
        const cursor = await memes.aggregate([
            { $match: { poster_id: user_id } },
            {
                $project: {
                    _id: false,
                    votes_of_type: `$votes.${vote_type}`
                }
            },
            { $unwind: "$votes_of_type" },
            { $count: "upvotes" }
        ]);
        const result = await cursor.next();

        if (!result) return 0;
        return result.upvotes;
    }
    catch (error) {
        log.error("Cannot count user total votes by type in mongo db", { error, request: { user_id, vote_type } });
        throw error;
    }
}

function get_user_top_meme(user_id) {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            {
                $match: {
                    poster_id: user_id,
                    'votes.like': { $exists: true }
                }
            },
            {
                $project: {
                    _id: false,
                    media_id: "$_id",
                    upvotes: { $size: "$votes.like" },
                    type: true
                }
            },
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

/**
 * Returns the poster id by searching for the group message id of a meme.
 */
module.exports.poster_id_get_by_group_message_id = async function (group_message_id) {
    const meme = await memes.findOne({ group_message_id }, { poster_id: 1, _id: 0 });
    if (!meme || !meme.poster_id)
        throw { error: "Cannot find meme", request: { group_message_id } };
    return meme.poster_id;
}

module.exports.get_user = async function (user_id) {
    const user = await users.findOne({ _id: user_id });
    user.id = user._id;
    return user;
}

module.exports.get_user_by_username = async function (username) {
    const user = await users.findOne({ username });
    user.id = user._id;
    return user;
}

function get_user_average_upvotes(user_id) {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            {
                $match: {
                    poster_id: user_id,
                    'votes.like': { $exists: true }
                }
            },
            {
                $project: {
                    upvotes: { $size: "$votes.like" }
                }
            },
            {
                $group: {
                    _id: "$poster_id",
                    average_upvotes: { $avg: "$upvotes" }
                }
            }
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

                if (!result) {
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
        {
            $group: {
                _id: "$poster_id",
                memes: { $sum: 1 }
            }
        },
        { $sort: { memes: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: collection_names.users,
                localField: "_id",
                foreignField: "_id",
                as: "users"
            }
        },
        {
            $replaceRoot: {
                newRoot: { $mergeObjects: [{ $arrayElemAt: ["$users", 0] }, "$$ROOT"] }
            }
        },
        { $project: { users: 0 } }
    ]);
    return result.toArray();
}

module.exports.meme_mark_as_removed = async function (message_id, removeRason, isRepost) {
    try {
        await memes.updateOne({ group_message_id: message_id }, { $set: { isRemoved: true, removeRason, isRepost } });
    }
    catch (error) {
        log.error("Cannot save removed flag", { error, request: { message_id } });
    }
}

async function get_meme_recent_best(vote_type, date_earliest, date_latest) {
    const vote_key = `votes.${vote_type}`;
    let match = {
        post_date: {
            $gte: date_earliest,
            $lt: date_latest
        }
    };
    match[vote_key] = { $exists: true };
    const result = await memes.aggregate([
        { $match: match },
        {
            $project: {
                relevant_votes: { $size: `$votes.${vote_type}` },
                votes: 1,
                poster_id: 1,
                type: 1
            }
        },
        { $sort: { relevant_votes: -1 } },
        { $limit: 1 },
        {
            $lookup: {
                from: collection_names.users,
                localField: "poster_id",
                foreignField: "_id",
                as: "users"
            }
        },
        {
            $project: {
                user: { $arrayElemAt: ["$users", 0] },
                media_id: "$_id",
                type: true,
                votes: true
            }
        },
        {
            $project: {
                _id: false,
                users: 0
            }
        }
    ]);
    if (!await result.hasNext()) {
        return null;
    }

    return await result.next()
}

async function get_meme_by_id(id) {
    const result = await memes.aggregate([
        { $match: { _id: id } },
        {
            $lookup: {
                from: 'users',
                localField: 'poster_id',
                foreignField: '_id',
                as: 'user'
            }
        }, {
            $replaceRoot: {
                newRoot: {
                    user: {
                        $arrayElemAt: [
                            '$user',
                            0
                        ]
                    },
                    _id: '$_id',
                    type: '$type',
                    votes: '$votes',
                    categories: '$categories',
                    group_message_id: '$group_message_id',
                    poster_id: '$poster_id'
                }
            }
        }
    ]);

    if (await result.hasNext()) {
        return await result.next();
    }

    throw "Cannot find meme";
}

async function get_meme_categories(id) {
    try {
        const result = await memes.findOne({
            _id: id
        }, {
            projection: { categories: 1 }
        });

        if (!result.categories) throw "Cannot find meme";

        return result.categories;
    }
    catch (error) {
        log.error("Faild getting meme categories from db", error);
        throw error;
    }
}

async function get_meme_random_good(vote_minimum, date_latest) {
    const match1 = { post_date: { $lt: date_latest } };
    const match2 = {};
    const project1 = { votes: 1, poster_id: 1, type: 1 };
    for (vote in vote_minimum) {
        match1[`votes.${vote}`] = { $exists: true };
        project1[`vote_count_${vote}`] = { $size: `$votes.${vote}` };
        match2[`vote_count_${vote}`] = { $gte: vote_minimum[vote] };
    }
    const result = await memes.aggregate([
        { $match: match1 },
        { $project: project1 },
        { $match: match2 },
        { $sample: { size: 1 } },
        {
            $lookup: {
                from: collection_names.users,
                localField: "poster_id",
                foreignField: "_id",
                as: "users"
            }
        },
        {
            $project: {
                user: { $arrayElemAt: ["$users", 0] },
                media_id: "$_id",
                type: true,
                votes: true
            }
        },
        {
            $project: {
                _id: false,
                users: 0
            }
        }
    ]);
    if (!await result.hasNext()) {
        return null;
    }

    return await result.next()
}

/**
 * Adds multiple categories to the categories field of a meme in the db.
 * Categories that exist will be ignored.
 * If no meme can be found an error will be thrown.
 * @param {The id of the meme} id
 * @param {The categories to add} categories
 */
async function meme_add_categories(id, categories) {
    const result = await memes.updateOne(
        { _id: id },
        { $addToSet: { categories: { $each: categories } } }
    );
    if (result.matchedCount < 1) {
        log.warning("Cannot add categories to meme in db.", { detail: `No meme found with id ${id}.`, result });
        throw "Cannot add categories";
    }
}

/**
 * Removes multiple categories from the categories field of a meme in the db.
 * Categories that do not exist will be ignored.
 * If no meme can be found an error will be thrown.
 * @param {The id of the meme*} id
 * @param {The categories to remove} categories
 */
async function meme_remove_categores(id, categories) {
    const result = await memes.updateOne(
        { _id: id },
        { $pull: { categories: { $in: categories } } }
    );
    if (result.matchedCount < 1) {
        log.warning("Cannot remove categories from meme in db.", { detail: `No meme found with id ${id}.`, result });
        throw "Cannot remove categories";
    }
}

module.exports.init = init;
module.exports.save_user = save_user;
module.exports.save_meme = save_meme;
module.exports.save_meme_categories = save_meme_categories;
module.exports.get_memes_by_user = get_memes_by_user;
module.exports.count_votes = count_votes;
module.exports.get_user_top_meme = get_user_top_meme;
module.exports.get_user_average_upvotes = get_user_average_upvotes;
module.exports.get_user_meme_counts = get_user_meme_counts;
module.exports.get_user_meme_count = get_user_meme_count;
module.exports.get_user_from_meme = get_user_from_meme;
module.exports.count_user_total_votes_by_type = count_user_total_votes_by_type;
module.exports.connected = connected;
module.exports.get_meme_recent_best = get_meme_recent_best;
module.exports.get_meme_random_good = get_meme_random_good;
module.exports.get_meme_by_id = get_meme_by_id;
module.exports.get_meme_categories = get_meme_categories;
module.exports.meme_add_categories = meme_add_categories;
module.exports.meme_remove_categores = meme_remove_categores;
