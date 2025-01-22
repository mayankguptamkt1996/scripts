/**
 * This scripts generates a whitelist for an item and seeds into the insiderlogistics.whitelists collections for logistics backend to use on ticket purchase
 * This is a peculiar setup for a DE event where we want to pre-generate whitelists for a DE event to be fed in turnstiles for scanning
 * Conventional DE tickets have a QR code which is alphanumeric string representing encrypting barcode and ticket data. This is scanned and read only by scanner apps, turnstiles can scan but cannot encrypt this data
 * For Zomaland Pune 2022, we have a requirement of scanning DE tickets on turnstiles, which means we need to pregenerate a whitelist for these tickets and feed into turnstiles. The whitelist should also contain barcodes that will be issued onground. This is a problem since QR codes for DE work only online
 * This script will generate and seed barcodes for item specific whitelist in DE and the logistics barcode will pick barcodes from this list if configured on logistics backend. PR: https://github.com/only-much-louder/insider-logistics/pull/172
 */

const _ = require('lodash');
const Promise = require('bluebird');
var csvjson = require('csvjson');
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;

const fs = require('fs');

var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};

// //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

// // Prod - Connection String
const connectionString =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

var file_data = fs.readFileSync('items1.csv', { encoding: 'utf8' });
const csvData = csvjson.toObject(file_data, options);
console.log(csvData);


function timeStamp(message) {
    console.log('[' + new Date().toISOString() + '] -', message)
}

async function main() {

    console.log(csvData.length);
    try {
        connection = await dbClient.connect(connectionString);
        const logisticsDB = connection.db("insiderlogistics");
        const coreDB = connection.db("insidercore");
        const barcodeformats = logisticsDB.collection("barcodeformats");
        const counters = logisticsDB.collection("counters");
        const whitelists = logisticsDB.collection("whitelists");
        const items = coreDB.collection("items");
        console.log('OUTER');
        try {
            for (let i = 0; i < csvData.length; i++) {
                let itemId = csvData[i].itemid;
                let whitelistCount = Number(csvData[i].total);
                const discountType = 'sale';
                console.log(`Item: ${itemId}, Count: ${whitelistCount}`);

                // fetch barcode format for given item
                const itemBarcodeFormat = await barcodeformats.findOne({ core_item_id: ObjectId(itemId) });

                if (_.isEmpty(itemBarcodeFormat)) {
                    timeStamp(`No barcode format found for item ${itemId}`);
                }

                // get event code from barcode format
                const { vendor_data: { event, issuer, location_code, sector, discount, ticket_type, ...vendordata } } = itemBarcodeFormat;
                // get counter for event code
                const counterDoc = await counters.findOne({ type: "whitelist", identifier: new RegExp(event, 'i') });

                if (_.isEmpty(counterDoc)) {
                    timeStamp(`This item ${itemId} doesn't have an event counter set for code ${event}, something is wrong`);
                }

                const whitelistToUpsert = _.times(whitelistCount, (iteratee) => {
                    const counterVal = _.padStart(counterDoc.counter + ++iteratee, 8, '0')

                    const barcode = `${issuer}${location_code}${event}${sector}${discount}${ticket_type}${counterVal}`;
                    return {
                        barcode,
                        core_item_id: ObjectId(itemId),
                        discount_type: discountType,
                        is_used: false,
                        blocked: false,
                        valid: true,
                        timestamp_added: new Date(),
                        timestamp_modified: new Date,
                        pregenerated: true
                    };
                });

                // timeStamp({ whitelistToUpsert });
                timeStamp({ actualwhitelistGenerated: whitelistToUpsert.length, expectedwhitelistGenerated: whitelistCount });

                console.log(whitelistToUpsert);
                // insert whitelist
                const whitelistInsertRes = await whitelists.insertMany(whitelistToUpsert);
                // update counter for event
                // const newCounter = counterDoc.counter + whitelistCount;
                const counterUpdateRes = await counters.findOneAndUpdate({
                    identifier: new RegExp(event, 'i')
                }, {
                    $inc: { counter: whitelistCount }
                });

                timeStamp({ whitelistInsertRes, counterUpdateRes });
            }
        } catch (e) {
            console.log(e);
        }
    } catch (e) {
        console.log(e)
    } finally {
        console.log('HAPPY TO HAVE ENDED');
        connection.close();
    }

}

main().catch(console.error);