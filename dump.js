
const config = require('./config/config.json');
const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'dump.csv',
  header: [
    {id: '_id', title: 'ID'},
    {id: 'type', title: 'Type'},
    {id: 'category', title: 'Kategorie'},
    {id: 'poster_id', title: 'User ID'},
    {id: 'first_name', title: 'Vorname'},
    {id: 'last_name', title: 'Nachname'},
    {id: 'username', title: 'Nutzername'},
    {id: 'likes', title: 'Likes'},
    {id: 'weebs', title: 'Weebs'},
    {id: 'self_like', title: 'Selbst-Like'},
    {id: 'self_weeb', title: 'Selbst-Weeb'},
    {id: 'group_message_id', title: 'Gruppennachricht ID'},
    {id: 'private_message_id', title: 'Requestnachricht ID'},
  ]
});
async function download_dump() {
    const dump = get_dump(moment().subtract(1, 'years').toDate(), moment().toDate());
    const data = []
    for await (const document of dump) {
        data.push(document);
        console.log(document);
    }
    await csvWriter.writeRecords(data);
}   

async function* get_dump(date_earliest, date_latest) {
    const client = new MongoClient(config.mongodb.connection_string, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(config.mongodb.database);
    const memes = db.collection(config.mongodb.collection_names.memes);

    try {
        const result = memes.aggregate([
            { $match: { post_date: {
                $gte: date_earliest,
                $lt : date_latest
            }}},
            { $lookup: {
                from: config.mongodb.collection_names.users,
                localField: "poster_id",
                foreignField: "_id",
                as: "users"
            }},
            { $replaceRoot: {
                newRoot: { $mergeObjects: [ { $arrayElemAt: [ "$users", 0 ] }, "$$ROOT" ] } 
            }},
            { $project: {
                _id: 1,
                type: 1,
                category: 1,
                poster_id: 1,
                first_name: 1,
                last_name: 1,
                username: 1,
                likes: { $size: { $ifNull: [ "$votes.like", []] }},
                weebs: { $size: { $ifNull: [ "$votes.weeb", []] }},
                self_like: { $in: [ "$poster_id", { $ifNull: [ "$votes.like", []] }] },
                self_weeb: { $in: [ "$poster_id", { $ifNull: [ "$votes.weeb", []] }] },
                group_message_id: 1,
                private_message_id: 1
            }}
        ]);

        while (await result.hasNext()) yield await result.next();
    }
    catch (error) {
        console.log("Cannot get meme dump from mongo db", error);
    }
}

download_dump().then(process.exit);