/** This Script helps you to download Chasless RFID devices data
 * Please refer the readme file for the context for the same 
 */
const aws = require('aws-sdk');
const mongo = require('mongodb');
const papa = require('papaparse');
const fs = require('fs-extra');
const bluebird = require('bluebird');
const _ = require('lodash');
const async = require('async')
const path = require('path');
const ObjectId = require("mongodb").ObjectId
var csvjson = require('csvjson');

const eventId ="6569eabb76058b000910bc7a"; // Put eventId here

const N = 1 // Fetching last n csv's for a particular device id

//connection string
const connectionString =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

// Config params required to access the s3 bucket
aws.config.update({
    accessKeyId: "AKIAI5OPC5GIXYA6NQZQ",
    secretAccessKey: "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",
    "region": "ap-south-1"
});

// Retures unique device ids stored in sold inv collection based on event Id
const fetchDeviceIds = async (eventId, SoldInventory) => {    
    const results = await SoldInventory.distinct('delivery_name', { event_id: ObjectId(eventId) });
    return results;
}

const chunkedIteration = async (invs, cb) => {
    // It works similar to concurrency. Here second param of chunk function (here 10) means it will proccess 10 device ids at one time
    await bluebird.mapSeries(_.chunk(invs, 10), chunkedInvs => {
        return Promise.all(chunkedInvs.map(cb));
    });
}

const writeToDisk = async (readStream, writePath, deviceId) => {
    return new Promise((resolve, reject) => {
        readStream.on('error', () => {
            console.log(`Error in downloading pdf for ${deviceId}`);
            resolve();
        })

        const writeStream = fs.createWriteStream(writePath);

        const pipedStream = readStream.pipe(writeStream);

        pipedStream.on('close', (e) => {
            if (e) {
                console.log(`Error in downloading csv for ${deviceId}`);
                return reject(e);
            }
            resolve();
        });
        pipedStream.on('error', (error) => {
            console.error(`Error writing CSV file ${deviceId} to disk: ${error}`);
            reject(error);
        });
    })
}

const S3 = new aws.S3();

const main = async () => {
    const connection = await mongo.connect(connectionString, {
        useNewUrlParser: true
    });

    const db = connection.db('insidercore');
    const SoldInventory = db.collection('soldinventories');

    try {
        // fetch device ids from db
        const deviceIds = await fetchDeviceIds(eventId, SoldInventory);
        console.log("================= Total DeviceID =====================");
        console.log(`Total Devices: ${deviceIds.length}`)
        const responseCsvData = []
        
        await chunkedIteration(deviceIds, async deviceId => {
            console.log('fetching for device_id : ' + deviceId);
            //reading the Csv's in S3 
            try {
                const objects = await S3.listObjectsV2({
                    Bucket: 'insider-cashless', // s3 bucket-name
                    Prefix: `device_backups/release/${deviceId}`
                }).promise();

                if (objects?.Contents.length == 0) {
                    responseCsvData.push({ DeviceId: deviceId, status: 'Found on Db but no folder Found on s3' });
                    const responseCsvOptions = { headers: 'keys' };
                    const responseCsv = csvjson.toCSV(responseCsvData, responseCsvOptions);
                    fs.writeFileSync('results.csv', responseCsv);
                }
                else {
                    const sortedObjects = objects.Contents.sort((a, b) => b.LastModified - a.LastModified);
                    // Take the first two objects (latest two modified CSV files)

                    const latestCsvObjects = sortedObjects.slice(0, N); // fetching last N files
               
                    const promises = latestCsvObjects.map(async (object) => {
                        const csvFileKey = object?.Key;
                    
                        if (csvFileKey && csvFileKey.endsWith('.csv')) {
                            const readStream = S3.getObject({
                                Bucket: 'insider-cashless',
                                Key: csvFileKey
                            }).createReadStream();

                            if (csvFileKey) {
                                fs.mkdirSync(`output-folder/${deviceId}`, { recursive: true })
                                const writePath = `output-folder/${deviceId}/${object.LastModified}${path.basename(csvFileKey)}`;
                                await writeToDisk(readStream, writePath, deviceId);
                            }
                        }
                    });
                    await Promise.all(promises);
                }
            }
            catch (error) {
                console.log(`Something went wrong while fetching data for ${deviceId}`);
                console.log(error);
            }
        })
        console.log('THIS IS DONE..... Please find the data in mentioned folder path - ref code: const writePath');
    } catch (error) {
        console.error(error);
    } finally {
        connection.close();
    }
}
main();