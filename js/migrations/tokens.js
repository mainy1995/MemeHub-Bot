const MongoClient = require('mongodb').MongoClient;
const { Client, Defaults } = require('redis-request-broker');
const { createHandyClient } = require('handy-redis');
/**
 * This script request all tokens from MemeHub-Limits and stores them on the redis
 */

const TOKENS_KEY = 'tokens:state:tokens';

async function migrate() {
    console.log("Running migration script for meme tokens...");

    // Mongo db
    const config = require('./../../config/config.json');
    const mongoClient = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await mongoClient.connect();
    console.log("Connected to mongo db.");

    // MemeHub-Limits
    const rrb = require('./../../config/rrb.json');
    Defaults.setDefaults({ redis: rrb.redis });
    const getQuota = new Client(rrb.queues.getUserQuota);
    await getQuota.connect();
    console.log("Connected to MemeHub-Limits.");

    // Redis
    const redis = createHandyClient(rrb.redis);
    redis.redis.on('connect', () => {
        console.log("Connected to redis.");
        runMigration(config, mongoClient, getQuota, redis).then(async () => {
            console.log("Shutting down...");
            await mongoClient.close();
            await getQuota.disconnect();
            await redis.quit();
            console.log("Shutdown complete.");
        })
    });
}

async function runMigration(config, mongoClient, getQuota, redis) {
    // Get Users
    const db = mongoClient.db(config.mongodb.database);
    const collectionUsers = db.collection(config.mongodb.collection_names.users);
    const users = await collectionUsers.find({}, { _id: 1 });
    const usersCount = await users.count();
    console.log(`Found ${usersCount} users.`);

    let errors = 0;
    let ignored = 0;
    let set = 0;
    for await (const user of users) {
        try {
            console.log("---------------------------");
            console.log(`ID:     ${user._id}`);

            const quota = await getQuota.request({ user_id: user._id });
            const tokens = quota.reward;
            console.log(`Tokens: ${tokens}`);

            if (!tokens) {
                console.log('Ingoring.');
                ignored++;
                continue;
            }

            const key = `${TOKENS_KEY}:${user._id}`;
            console.log(`Setting "${key}" to '${tokens}'`);
            const ok = await redis.set(key, tokens);
            if (ok !== 'OK')
                throw new Error(`Redis response is not OK: ${ok}`);

            set++;
        }
        catch (error) {
            errors++;
            console.error("Failed to handle user:", user._id);
            console.log(error);
        }
    }
    console.log('========================================');
    console.log(`Finished.`);
    console.log('Set:    ', set);
    console.log('Ignored:', ignored);
    console.log('Errors: ', errors);
    console.log('Total:  ', set + ignored + errors);
    console.log('Count:  ', usersCount);

    if (errors > 0) {
        console.warn(`WARNING: GOT ${errors} errors!`);
    }
    else {
        console.log("No errors occoured.");
    }
}

migrate();
