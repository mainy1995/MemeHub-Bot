const mysql = require('mysql');
const util = require('./util');
let connection;

/**
 * Initializes the database connection
 */
function init() {
    let mysql_password = util.load_env_variable("MYSQL_PASSWORD");
    let mysql_host = util.load_env_variable("MYSQL_HOST");
    let mysql_user = util.load_env_variable("MYSQL_USER");
    let mysql_db = util.load_env_variable("MYSQL_DB");
    
    //Create SQL Connection
    connection = mysql.createConnection({
        host: mysql_host,
        user: mysql_user,
        password: mysql_password,
        database: mysql_db
    });

    open_connection()
        .then(() => {
            console.log("Connection to db established");
        })
        .catch(() => {
            console.log("ERROR: Could not connect to the database");
            process.exit(1)
        });
}

/**
 * opens the connection to the database.
 */
function open_connection() {
    return new Promise((resolve, reject) => {
        connection.connect((err) => {
            if (err) {
                console.log("ERROR: Could not connect to the sql database");
                console.log(`  > Error: ${err}`);
                reject(err);
                return;
            }
            resolve();
        });
    });
}

/**
 * Saves a user in the database.
 * @param {The user to save} user 
 */
function save_user(user) {
    let sql = "REPLACE INTO user (UserID, Username, Vorname, Nachname) VALUES (?, ?, ?, ?);";
    connection.query(sql, [user.id, user.username, user.first_name, user.last_name], function (err, result) {
        if (err) {
            console.log("ERROR: Failed to save user");
            console.log(`  > Query: ${sql}`);
            console.log(`  > Error: ${err}`);
            return;
        }
        console.log(`User saved to db (${result})`);
    });
}

/**
 * Saves a meme to the database.
 * @param {The id of the user how send the meme} user_id 
 * @param {The file id of the meme} file_id 
 * @param {The id of the message from the user} message_id 
 * @param {The category of the meme} category 
 */
function save_meme(user_id, file_id, message_id, category) {
    return new Promise(function(resolve, reject) {
        let sql = `INSERT INTO memes (UserID, photoID, privMessageID, categorie) VALUES (?, ?, ?, ?)`;
        connection.query(sql, [user_id, file_id, message_id, category], function (err) {
            if (err) {
                console.log("ERROR: Could not insert meme");
                console.log(`  > Query: ${sql}`);
                console.log(`  > Error: ${err}`);
                reject(err);
                return;
            }
            console.log("Meme saved to db");
            resolve();
        });
    });
}

/**
 * Saves the message id of a recently send message. This is supposed to be used after sending a meme to the meme group.
 * @param {The message context that got returned from the message to the meme group} ctx 
 */
function save_meme_group_message(ctx) {
    var sql = `UPDATE memes set groupMessageID=? where photoID=?;`;
    connection.query(sql, [ctx.message_id, util.any_media_id(ctx)], function (err) {
        if (err) {
            console.log("ERROR: Could not save message id after sending meme to group");
            console.log(`  > Query: ${sql}`);
            console.log(`  > Error: ${err}`);
            return;
        }
        console.log("Saved meme group message");
    });
}

function save_upvote(user_id, file_id) { 
    return new Promise((resolve, reject) => {
        var sql = "INSERT INTO votes (userID, photoID, vote) VALUES (?, ?, true) ON DUPLICATE KEY UPDATE vote = !vote;";
        connection.query(sql, [user_id, file_id], function (err) {
            if (err) {
                console.log("ERROR: Could not save upvote");
                console.log(`  > Query: ${sql}`);
                console.log(`  > Error: ${err}`);
                reject(err);
                return;
            }
            resolve();
        });
    });
}

/**
 * Counts the amount of upvotes on the given meme.
 * @param {The id of the meme} file_id 
 */
function count_upvotes(file_id) {
    return new Promise((resolve, reject) => {
        var sql = "select sum(vote) as upvotes  from votes where photoID=?;";
        connection.query(sql, [file_id], function (err, result) {
            if (err) {
                console.log("ERROR: Could not count upvotes");
                console.log(`  > Query: ${sql}`);
                console.log(`  > Error: ${err}`);
                reject(err);
                return
            }
            resolve(result[0].upvotes);
        });
    });
    
}

function get_user_top_meme(user_id) {
    return new Promise((resolve, reject) => {
        var sql = "Select photoID, max(upvotes) as upvotes from Statistik where UserID=?;";    
        connection.query(sql, [user_id], function (err, result) {
            if (err) {
                console.log("ERROR: Could not get users top meme");
                console.log(`  > Query: ${sql}`);
                console.log(`  > Error: ${err}`);
                reject(err);
                return;
            }
            resolve({
                media_id: result[0].photoID,
                upvotes: result[0].upvotes
            });
        });
    });
}

function get_user_average_upvotes(user_id) {
    return new Promise((resolve, reject) => {
        var sql = "Select round(avg(upvotes),2) as average from Statistik where UserID=?;";
        connection.query(sql, [user_id], function (err, result) {
            if (err) {
                console.log("ERROR: Could not get users avaerage upvote count");
                console.log(`  > Query: ${sql}`);
                console.log(`  > Error: ${err}`);
                reject(err);
                return;
            }
            resolve(result[0].average);
        });
    });
}

function get_user_meme_counts() {
    return new Promise((resolve, reject) => {
        var sql = "Select *  from MemeAnzahl order by meme_sum desc;";
        connection.query(sql, function (err, result) {
            if (err) {
                console.log("ERROR: Could not get users avaerage upvote count");
                console.log(`  > Query: ${sql}`);
                console.log(`  > Error: ${err}`);
                reject(err);
                return;
            } 
            let overview = {}
            result.forEach(element => {
                if (!element.Username) return;
                overview[element.Username] = element.meme_sum;
            });
            resolve(overview);
        })
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