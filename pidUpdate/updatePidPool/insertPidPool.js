/**
 * Get the pid_pool - pool_name to be shared by CM team
 * This Script first updates pid pool
 * Second it updates the brand merchant
 * third it updates the events payout_to:"brand_mid"
 */
const mongodb = require("mongodb");
const fs = require('fs');
const MongoClient = mongodb.MongoClient;
var csvjson = require('csvjson');
const Promise = require('bluebird');
const request = require('request-promise');
var mongoose = require('mongoose');
const { Console } = require("console");
var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};
var stageUriBrand = 'https://internal-staging.insider.in/brand';
var prodUriBrand = 'http://internal.insider.in/brand';
var stageUriEvent = 'https://internal-staging.insider.in/event/register';
var prodUriEvent = 'http://internal.insider.in/event/register';
var eventPayoutTo = "brand_mid";

var eventId = [""];
var brandId = "";
var brandMerchantName = "";
var apiKey = "";
var userId = "";
var eventUri = stageUriEvent;
var brandUri = stageUriBrand;

const main = async () => {
    // PROD - Connection String
    //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

    // //Staging - Connection String
    //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

    const connection = await MongoClient.connect(connectionString);
    const core = connection.db('insidercore');
    const eventsdb = core.collection("events");

    const productIdPool = core.collection("paytmproductids");
    const updateMerchantPoolName = {
        "merchant": {
            "pid_pool": brandMerchantName
        },
        timestamp_modified: new Date()
    };

    try {
        //FOR UPDATING THE MERCHANT PID_POOL
        var file_data = fs.readFileSync('pidpool.csv', { encoding: 'utf8' });
        const csvData = csvjson.toObject(file_data, options);
        //Iterating over each row in the csv
        await Promise.map(csvData, async (csvRow) => {
            var pid = csvRow.paytm_product_id;
            var poolName = csvRow.pid_pool;
            var pidUsed = false;
            var date = new Date();
            const pidPoolUpdate = {
                "paytm_product_id": pid,
                "pid_pool": poolName,
                "is_used": pidUsed,
                "timestamp_added": date,
                "timestamp_modified": date
            };
            const existingPid = await productIdPool.find({ "paytm_product_id": pid }).toArray();
            if (existingPid.length) {
                console.log("Paytm Product Id already Exists: " + pid);
            }
            else {
                console.log("Paytm Product Id Updated: " + pid);
                await productIdPool.insertMany([pidPoolUpdate])
            }
        }, {
            concurrency: 1
        });


        //Updating the Merchants in Brands collection
        var brandReq = {
            method: 'POST',
            headers: {
                "api-key": apiKey,
                "Cache-Control": "no-cache",
                'x-filter-by': '"*"',
                "Content-Type": "application/json; charset=utf-8",
            },
            uri: brandUri,
            body:
            {
                _id: brandId, // Passing the brand Id 
                ...updateMerchantPoolName // Merge the updateMerchantPoolName object into the body
            },
            json: true // Automatically stringifies the body to JSON
        };

        const brandResponse = await request(brandReq);
        console.log("Barnds Collection Updated...");
        // // Updating the Payout_to in events collection
        for (let i = 0; i < eventId.length; i++) {
            const eventdata = await eventsdb.find({ _id: new mongoose.Types.ObjectId(eventId[i]) }).toArray();

            eventdata[0].payout_to = eventPayoutTo;
            const header = { 'Content-Type': 'application/json', 'API-KEY': apiKey, 'X-User-Id': userId,  'X-Filter-By': JSON.stringify({ edit: '*', assign: '*' }) };
          
            var eventReq = {
                method: 'POST',
                headers: header,
                uri: eventUri,
                body:
                {
                    ...eventdata[0] // Merge the updateEventsPayoutTo object into the body
                },
                json: true // Automatically stringifies the body to JSON
            };
            const eventResponse = await request(eventReq);
            console.log("payout_to updated for event : " + eventdata[0].name)
        }
    } catch (e) {
        console.log(e);
    } finally {
        connection.close();
    }

}
main()
    .then(() => { console.log('---- This is Done - Verify the same in DB -----'); process.exit(1) });