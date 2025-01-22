/*
DOC link- https://wiki.mypaytm.com/display/INSIDER/Documentation+-+Bulk+update+the+Paytm+Product+Id%27s

This script will map item id to the mentioned product ID as given sample code.
*/


const mongodb = require("mongodb");
//const _ = require("lodash");
const fs = require('fs');
//var ObjectId = require('mongodb').ObjectID;
const MongoClient = mongodb.MongoClient;
var mongoose = require('mongoose');
var csvjson = require('csvjson');
const Promise = require('bluebird');
var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};

const main = async () => {
    // // PROD - Connection String
    const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

    // //Staging - Connection String
    //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

    const connection = await MongoClient.connect(connectionString);
    const core = connection.db('insidercore');
    const items = core.collection("items");
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalNotUpdated = 0;
    // Script is used to update the paytm_product_id field in the items collection.
    try {
        // Input csv file name also verify the coulmn names itemid,pid 
        var file_data = fs.readFileSync('pidupdate.csv', { encoding: 'utf8' });
        const csvData = csvjson.toObject(file_data, options);
        let responseCsvData = [];

        //Iterating over each row in the csv and doing the update
        await Promise.map(csvData, async (csvRow) => {
            var pid = csvRow.pid;

            // current time in UTC 
            const ondate = new Date();

            //taking Item ID as ObjectID('')
            var itemID = { _id: new mongoose.Types.ObjectId(csvRow.itemid) }; //new mongoose.Types.ObjectId(Id)
            console.log(itemID);
            //setting the paytm_product_id field to an object with the new data
            var itmUpdate = { $set: { paytm_product_id: pid, timestamp_modified: ondate } };

            const pidcheck = await items.findOne({ paytm_product_id: pid });

            if (pidcheck) {
                //console.log("----Product Id already used (SKIPPED) ---- : " + pid);
                responseCsvData.push({ itemid: csvRow.itemid, pid: pid, status: 'skipped' });
                totalSkipped++;
            }
            else if (pidcheck == null) {

                await items.findOneAndUpdate(itemID, itmUpdate);

                var pidupdatecheck = await items.findOne({ paytm_product_id: pid, _id: itemID._id});
                if (pidupdatecheck == null) {
                    //console.log("Updated: " + pid + " for itme id: " + itemID._id);
                    totalNotUpdated++;
                    responseCsvData.push({ itemid: csvRow.itemid, pid: pid, status: 'not updated' });
                }
                else if (pidupdatecheck) {
                    //console.log("Not updated: " + pid + " for itme id: " + itemID._id)
                    totalUpdated++;
                    responseCsvData.push({ itemid: csvRow.itemid, pid: pid, status: 'updated' });
                }

            }

            // write the response CSV file
            const responseCsvOptions = { headers: 'keys' };
            const responseCsv = csvjson.toCSV(responseCsvData, responseCsvOptions);
            fs.writeFileSync('pidupdate_response.csv', responseCsv);


        });
    } catch (e) {
        console.log(e);
    } finally {
        connection.close();
    }
    console.log("Total updated pid's: ", totalUpdated);
    console.log("Total not updated pid's: ", totalNotUpdated);
    console.log("Total skipped pid's: ", totalSkipped);

}
main()
    .then(() => { console.log('---- Check the response file for output -----'); process.exit(1) });