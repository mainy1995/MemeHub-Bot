const MongoClient = require('mongodb').MongoClient;
/**
 * This script takes all memes from a mongodb collection and
 * creates the new field categories with an array of categories
 */

async function migrate() {
    const config = require('./../../config/config.json');
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    const memes = db.collection(config.mongodb.collection_names.memes);
    const result = await memes.find();
    let totalMemes = 0;
    let totalUpdated = 0;
    for await (const meme of result) {
        try {
            totalMemes++;
            const categories = meme.category ? [meme.category] : [];
            console.log();
            console.log();
            console.log(`MEME ID:    ${meme._id}`);
            console.log(`category:   ${meme.category}`);
            console.log(`categories: ${JSON.stringify(categories)}`);
            const r = await memes.updateOne(
                { _id: meme._id },
                { $set: { categories } }
            );
            if (r.modifiedCount !== 1)
                throw `Update may not have worked for meme ${meme._id}. ${r.modifiedCount} documents have been modified.`;
            totalUpdated++;
            console.log('SUCCESS');
        }
        catch (error) {
            console.log(error);
        }
    }
    console.log();
    console.log('========================================');
    console.log(`Updated ${totalUpdated} of ${totalMemes} memes successfully.`);
    process.exit();
}

migrate();
