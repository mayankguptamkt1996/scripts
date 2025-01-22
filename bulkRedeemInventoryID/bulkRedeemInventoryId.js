/*
This script is used to redeem the inventory ids.
Doc link - https://wiki.mypaytm.com/pages/viewpage.action?pageId=372259382
*/

const _ = require('lodash');
const Promise = require('bluebird');
const fetch = require("node-fetch");
const path = require('path');
const parse = require('csv-parse/lib/sync');
const papaparse = require('papaparse');
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const fs = require('fs');

// PROD - Connection String
//const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

// //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

const SYS_NONE_EMAIL_USER_KEY =
	"";  //Add your api_key before running the script
const X_USER_ID = "";  ////Add your user_id


function timeStamp(message){
    console.log ( '[' + new Date().toISOString() + '] -', message )
}

async function main () {
    let connection;
    timeStamp('here');

    const filePath = '/inventoryId.csv'
    const output = [];


    try {
        const shortcodesData = parse(fs.readFileSync(path.join(__dirname, filePath)), {columns : true});

        connection = await dbClient.connect(connectionString);
        const coreDB = connection.db("insidercore");
        const Sold = coreDB.collection("soldinventories");


        await Promise.map(shortcodesData, async (data) => {
            try {
                console.log({ data  });
                if(!data['id']) {
                    return Promise.resolve();
                }

                const id = data['id']
                const shortcode = data['shortcode']
                const inventories = await Sold.find({_id : ObjectId(id)}).toArray();

                const inventoriesIds = _.map(inventories, (d) => {
                    return { _id: d._id }
                })

                if(inventoriesIds.length < 1) {
                    return Promise.resolve();
                }

                const payload = {
                    "inventories" : inventoriesIds
                }

                console.log({ payload });

                const result = await fetch(
                    "http://new-internal.insider.in/transaction/redeemInventory",
                    {
                        method: "POST",
                        headers: {
                            'API-KEY': SYS_NONE_EMAIL_USER_KEY,
                            'Content-Type': 'application/json',
                            'X-User-Id': X_USER_ID
                        },
                        body: JSON.stringify(payload)
                    }
                );
                const status = result.status;
                console.log({ result: status });
                console.log(`Core response is ${status}`);
                output.push({
                    status: 'success',
                    shortcode: shortcode,
                    status: status,
                    error: null,
                    data: JSON.stringify(data)
                })
                return status;
            }
            catch (e) {
                console.error(e);
                console.log("failed for :", { data });
                output.push({
                    status: 'fail',
                    shortcode: '',
                    status: '',
                    error: e,
                    data: JSON.stringify(data)
                })
                return;
            }

        }, {concurrency: 1});

    } catch(e) {
        timeStamp({ e });
    } finally {

        timeStamp("closing connection");
        connection.close();

        if(output.length > 0) {

            timeStamp({ count: output.length });

            console.log("****");
            timeStamp("WRITING TO FILE");
            let rowsData = papaparse.unparse(output);
            fs.writeFileSync(`./output_${new Date().toISOString()}.csv`,rowsData);
        }
        return Promise.resolve();
    }
}

main().catch(console.error);
