const moment = require('moment');
const util = require('./util');

module.exports.most_voting = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: { $gt: moment("2019-01-01T00:00:00.000Z").toDate() }
            }
        }, {
            $project: {
                _id: 0,
                votes: {
                    $concatArrays: [
                        { $ifNull: ["$votes.like", []] },
                        { $ifNull: ["$votes.weeb", []] }
                    ]
                }
            }
        }, {
            $unwind: {
                path: "$votes"
            }
        }, {
            $group: {
                _id: "$votes",
                count: {
                    $sum: 1
                }
            }
        }, {
            $sort: {
                count: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        }, {
            $replaceRoot: {
                newRoot: {
                    _id: "$_id",
                    user: { $arrayElemAt: ["$user", 0] },
                    count: "$count"
                }
            }
        }
    ]);
    await showResults("Most votes cast", result, m => m.count);
}

module.exports.best_average = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: {
                    $gt: moment('2019-01-01T00:00:00.000Z').toDate()
                }
            }
        }, {
            $group: {
                _id: '$poster_id',
                avg_votes: {
                    $avg: {
                        $size: {
                            $ifNull: [
                                '$votes.like',
                                []
                            ]
                        }
                    }
                },
                memes: {
                    $sum: 1
                }
            }
        }, {
            $match: {
                memes: { $gt: 10 }
            }
        }, {
            $sort: {
                avg_votes: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    avg_votes: '$avg_votes',
                    memes: '$memes'
                }
            }
        }
    ]);
    await showResults("Most average likes", result, m => m.avg_votes);
}

module.exports.most_likes = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: {
                    $gt: moment('2019-01-01T00:00:00.000Z').toDate()
                }
            }
        }, {
            $group: {
                _id: "$poster_id",
                likes: {
                    $sum: { $size: { $ifNull: ["$votes.like", []] } }
                }
            }
        }, {
            $sort: {
                likes: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    likes: '$likes'
                }
            }
        }
    ]);
    await showResults("Most total likes", result, m => m.likes);
}

module.exports.most_memes = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: {
                    $gt: moment('2019-01-01T00:00:00.000Z').toDate()
                }
            }
        }, {
            $group: {
                _id: "$poster_id",
                memes: {
                    $sum: 1
                }
            }
        }, {
            $sort: {
                memes: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    memes: '$memes'
                }
            }
        }
    ]);
    await showResults("Most total memes", result, m => m.memes);
}

module.exports.most_weeb_votes = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: {
                    $gt: moment('2019-01-01T00:00:00.000Z').toDate()
                }
            }
        }, {
            $group: {
                _id: "$poster_id",
                likes: {
                    $sum: { $size: { $ifNull: ["$votes.weeb", []] } }
                }
            }
        }, {
            $sort: {
                likes: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    likes: '$likes'
                }
            }
        }
    ]);
    await showResults("Most total likes", result, m => m.likes);
}

module.exports.most_oc = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: {
                    $gt: moment('2019-01-01T00:00:00.000Z').toDate()
                },
                category: "OC"
            }
        }, {
            $group: {
                _id: "$poster_id",
                memes: {
                    $sum: 1
                }
            }
        }, {
            $sort: {
                memes: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    memes: '$memes'
                }
            }
        }
    ]);
    await showResults("Most #OC memes", result, m => m.memes);
}

module.exports.lowest_average_likes = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: {
                    $gt: moment('2019-01-01T00:00:00.000Z').toDate()
                }
            }
        }, {
            $group: {
                _id: '$poster_id',
                avg_votes: {
                    $avg: {
                        $size: {
                            $ifNull: [
                                '$votes.like',
                                []
                            ]
                        }
                    }
                },
                memes: {
                    $sum: 1
                }
            }
        }, {
            $match: {
                memes: { $gt: 10 }
            }
        }, {
            $sort: {
                avg_votes: 1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    avg_votes: '$avg_votes',
                    memes: '$memes'
                }
            }
        }
    ]);
    await showResults("Least average likes", result, m => m.avg_votes);
}

module.exports.best_meme = async function (memes) {
    const result = await memes.aggregate([
        {
            $match: {
                post_date: { $gt: moment("2019-01-01T00:00:00.000Z").toDate() }
            }
        }, {
            $project: {
                _id: 0,
                poster_id: 1,
                likes: { $size: { $ifNull: ["$votes.like", []] } }
            }
        }, {
            $group: {
                _id: "$poster_id",
                likes: { $max: "$likes" }
            }
        }, {
            $sort: {
                likes: -1
            }
        }, {
            $limit: 5
        }, {
            $lookup: {
                from: 'users',
                localField: '_id',
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
                    likes: '$likes'
                }
            }
        }
    ]);
    await showResults("Best Meme", result, m => m.likes);
}

async function showResults(title, results, value) {
    console.log(`\n${title}:`);
    let position = 1;
    while (await results.hasNext()) {
        const meme = await results.next();
        console.log(`  ${position}. ${util.name_from_user(meme.user)} (${value(meme)})`);
        position++;
    }
}