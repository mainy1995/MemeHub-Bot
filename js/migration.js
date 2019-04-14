const mysql = require('mysql');
const mongo = require('./mongo-db');
const util = require('./util');

let connection;

function run() {
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

    mongo.init();
    setTimeout(migrate_users, 1000);
    setTimeout(migrate_memes, 2000);
    setTimeout(migrate_upvotes, 4000);
    
}

function migrate_users() {
    var sql = "select * from user";    
    connection.query(sql, function (err, result) {
        if (err) {
            console.log("ERROR: Could not get users top meme");
            console.log(`  > Query: ${sql}`);
            console.log(`  > Error: ${err}`);
            reject(err);
            return;
        }

        console.log(`Found ${result.length} users`);
        for (var i = 0; i < result.length; i++) {
            let user = result[i];
            console.log(user);
            mongo.save_user({
                id: user.UserID,
                username: user.Username,
                first_name: user.Vorname,
                last_name: user.Nachname
            });
        }
    });
}

function migrate_memes() {
    var sql = "select * from memes";    
    connection.query(sql, function (err, result) {
        if (err) {
            console.log("ERROR: Could not get users top meme");
            console.log(`  > Query: ${sql}`);
            console.log(`  > Error: ${err}`);
            reject(err);
            return;
        }

        console.log(`Found ${result.length} memes`);
        for (var i = 0; i < result.length; i++) {
            let meme = result[i];
            console.log(meme);
            var category = meme.categorie;
            if (!category || category == 'undefined') category = null;
            mongo.save_meme(meme.UserID, meme.photoID, 'photo', meme.privMessageID, category, meme.groupMessageID, new Date(meme.date));
        }
    });
}

function migrate_upvotes() {
    var sql = "select * from votes";    
    connection.query(sql, function (err, result) {
        if (err) {
            console.log("ERROR: Could not get users top meme");
            console.log(`  > Query: ${sql}`);
            console.log(`  > Error: ${err}`);
            reject(err);
            return;
        }

        console.log(`Found ${result.length} votes`);
        for (var i = 0; i < result.length; i++) {
            let vote = result[i];
            console.log(vote);
            if (vote.vote != 1) continue;
            mongo.save_upvote(vote.userID, vote.photoID);
        }
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

run();