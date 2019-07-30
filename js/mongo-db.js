const util = require('./util.js');
const MongoClient = require('mongodb').MongoClient;
const collection_names = {
    memes: "memes",
    users: "users"
};
let client;
let memes;
let users;
let db_name;

function init(database = 'test') {
    db_name = database;
    const uri = util.load_env_variable('MONGO_CONNECTION');
    client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect((err) => {
        if (err) return log_err(err);
        console.log("Connected to mongodb");
        const db = client.db(db_name);
        db.createCollection(collection_names.memes)
            .then(collection => memes = collection)
            .catch(log_err);
        db.createCollection(collection_names.users)
            .then(collection => users = collection)
            .catch(log_err);
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
    ).catch(log_err);
}

function log_err(err) {
    console.log("ERROR: db operation failed.");
    console.log(`  > Error: ${err}`);
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
            upvoted_by: [],
            post_date: post_date
        })
        .then(resolve)
        .catch(reject);
    });
}

/**
 * Saves the message id of a recently send message. This is supposed to be used after sending a meme to the meme group.
 * @param {The message context that got returned from the message to the meme group} ctx 
 */
function save_meme_group_message(ctx) {
    let file_id = util.any_media_id(ctx);
    console.log(`message id: ${ctx.message_id}`);
    if (!file_id) {
        console.log("Cannot save meme group message: missing file id");
        return;
    }
    memes.updateOne(
        { _id: file_id },
        { $set: { group_message_id: ctx.message_id }}
    )
    .catch(log_err);
}

function save_upvote(user_id, file_id) { 
    return new Promise((resolve, reject) => {
        memes.findOne({ _id: file_id, upvoted_by: user_id }, { _id: true })
            .then(meme => {
                if (meme) {
                    memes.updateOne(
                        { _id: file_id },
                        { $pull: { upvoted_by: user_id }}
                    ).then(resolve, reject);
                }
                else {
                    memes.updateOne(
                        { _id: file_id },
                        { $addToSet: { upvoted_by: user_id }}
                    ).then(resolve, reject);
                }
            }, reject);
    });
}

/**
 * Counts the amount of upvotes on the given meme.
 * @param {The id of the meme} file_id 
 */
function count_upvotes(file_id) {
    return new Promise((resolve, reject) => {
        var result = memes.findOne({ _id: file_id })
            .then(meme => {
                if (!meme || !meme.upvoted_by) {
                    reject();
                    return;
                }

                resolve(meme.upvoted_by.length);
            }, log_err);
    });
}

function get_user_top_meme(user_id) {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            { $match: { poster_id: user_id }},
            { $project: {
                _id: false,
                media_id: "$_id",
                upvotes: { $size: "$upvoted_by" },
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

function get_user_average_upvotes(user_id) {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            { $match: { poster_id: user_id }},
            { $project: {
                upvotes: { $size: "$upvoted_by" }
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

function get_user_meme_counts() {
    return new Promise((resolve, reject) => {
        memes.aggregate([
            { $group: { 
                _id: "$poster_id",
                memes: { $sum: 1 }
            }},
            { $sort: { memes: -1 }},
            { $limit: 5 },
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
        ], {}, (err, cursor) => {
            if (err) {
                reject(err);
                return;
            }
            
            cursor.toArray((err, users) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(users);
            });
        });
    });
}

module.exports.init = init;
module.exports.save_user = save_user;
module.exports.save_meme = save_meme;
module.exports.save_meme_group_message = save_meme_group_message;
module.exports.save_upvote = save_upvote;
module.exports.count_upvotes = count_upvotes;
module.exports.get_user_top_meme = get_user_top_meme;
module.exports.get_user_average_upvotes = get_user_average_upvotes;
module.exports.get_user_meme_counts = get_user_meme_counts;