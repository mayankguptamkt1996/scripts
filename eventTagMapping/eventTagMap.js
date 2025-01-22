/*
This script will be used to map event id to the tag id and it will also check for duplicate tag id if mapped to an event
Doc link - https://wiki.mypaytm.com/display/INSIDER/Documentation+-+Event+Tag+Mapping
*/
'use strict';
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;
const ObjectId = require("mongodb").ObjectId
const parseCSV = require('csv-parse/lib/sync');
const fs = require('fs');
const path = require('path');
const connectionString =
"mongodb://" +
process.env.MONGODB_USERNAME +
":" +
process.env.MONGODB_PASSWORD +
"@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

// //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

const CSV_FILE_PATH = path.resolve('.', 'event_tag_map.csv');
const main = async () => {
    const connection = await dbClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    const core = connection.db('insidercore');
    const events = core.collection('events');

    const EventData = parseCSV(fs.readFileSync(CSV_FILE_PATH, 'utf8'), { columns: true });

    try {
        const eventsBulkOp = events.initializeUnorderedBulkOp();
        for (let tag of EventData) {
            let tagId = tag.tag_id;
            let eventId = tag.event_id;
            const result =
                await events.find({
                    "_id": ObjectId(eventId.toString()),
                    "tags.tag_id": ObjectId(tagId)
                }).project({ _id: 1, tags: 1 }).toArray();

            if (!result.length) {
                await eventsBulkOp
                    .find({
                        _id: ObjectId(eventId)
                    }).update({
                        $addToSet: {
                            tags: {
                                "tag_id": ObjectId(tagId),
                                "_id": new ObjectId(),
                                "priority": 0,
                                "is_carousel": false,
                                "is_featured": false,
                                "is_pick": false,
                                "is_primary_interest": false
                            }
                        }
                    })
                console.log("Tag inserted for : ",eventId);
            }else {
                console.log("Already have tag for event : ",eventId);
            }
        }
        
        const eventsRes = await eventsBulkOp.execute();
        console.log('done upserting!', JSON.stringify({ eventsRes }));
    } catch (error) {
        console.log("Already have tag for all events");
    } finally {
        await connection.close();
    }
}

main()
    .then(() => console.log('done'));