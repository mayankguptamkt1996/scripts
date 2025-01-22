/** This Script helps you to download invoices from S3 pdfs
 * Please refer the readme file for the context for the same 
 */
const aws = require('aws-sdk');
const mongo = require('mongodb');
const fs = require('fs-extra');
const bluebird = require('bluebird');
const _ = require('lodash');
const path = require('path');
const ObjectId = require("mongodb").ObjectId
var csvjson = require('csvjson');

const BUCKET_NAME = 'queuemaster-invoices-mb';
const SHORT_CODE_LENGTH = 6;

const eventId ="655b0fdb1ab7aa0008336f32"; // Put eventId here

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

const fetchShortcodes = async (eventIds, SoldInventory, statusArr) => {
  const results = await SoldInventory.distinct("shortcode", {
    event_id: ObjectId(eventIds),
    status: { $in: statusArr },
  });
  return results;
};

const chunkedIteration = async (invs, cb) => {
    // It works similar to concurrency. Here second param of chunk function (here 10) means it will proccess 10 device ids at one time
    await bluebird.mapSeries(_.chunk(invs, 10), chunkedInvs => {
        return Promise.all(chunkedInvs.map(cb));
    });
}

const writeToDisk = async (readStream, writePath, eventId) => {
    return new Promise((resolve, reject) => {
        readStream.on('error', (err) => {
            console.log(`Error in downloading pdf for ${eventId}: `, err);
            resolve();
        })

        const writeStream = fs.createWriteStream(writePath);

        const pipedStream = readStream.pipe(writeStream);

        pipedStream.on('close', (e) => {
            if (e) {
                console.log(`Error in downloading pdf for ${eventId}`);
                return reject(e);
            }
            resolve();
        });
        pipedStream.on('error', (error) => {
            console.error(`Error writing CSV file ${eventId} to disk: ${error}`);
            reject(error);
        });
    })
}

const S3 = new aws.S3();
async function* listAllKeys(opts) {
  let params = { ...opts };
  do {
    const data = await S3.listObjectsV2(params).promise();
    params.ContinuationToken = data.NextContinuationToken;
    yield data;
  } while (params.ContinuationToken);
}

async function main(){
    const connection = await mongo.connect(connectionString, {
        useNewUrlParser: true
    });

    const db = connection.db('insidercore');
    const SoldInventory = db.collection('soldinventories');

    try {

        const shortCodesToExclude = await fetchShortcodes(eventId, SoldInventory, ["refunded", "insured_cancelled", "cancelled"]);
        let opts = {
            Bucket: BUCKET_NAME,
            Prefix: eventId,
        };
        let arr = [];
        for await (const data of listAllKeys(opts)) {
            arr.push(data.Contents);
        }
        arr = arr.flat(1).map(item => item.Key);
        // let shortCodes = arr.map(item => {
        //     let str = item.split('/');
        //     return str[str.length - 1].split('.pdf')[0].slice(0,6);
        // });
        // shortCodes = shortCodes.filter((item, index, self) => self.indexOf(item) === index);
        let resultingKeys = arr.filter(item => {
            let fileName = item.split('/');
            shortCode = fileName[fileName.length - 1].slice(0, SHORT_CODE_LENGTH);
            return !shortCodesToExclude.includes(shortCode);
        });
        console.log('shortCodesToExclude length: ', shortCodesToExclude.length);
        // console.log('shortcodes: ', shortCodes.length);
        console.log('resulting keys: ', resultingKeys.length);
        console.log('arr.length: ', arr.length);
        // for(const key of resultingKeys){
        //     const readStream = S3.getObject({
        //         Bucket: BUCKET_NAME,
        //         Key: key
        //     }).createReadStream();
        //     fs.mkdirSync(`output-folder/${eventId}`, { recursive: true })
        //     const writePath = `output-folder/${eventId}/${key}`;
        //     await writeToDisk(readStream, writePath, eventId);
        // }

        const promises = resultingKeys.map(async (key) => {
                        
            if (key && key.endsWith('.pdf')) {
                const readStream = S3.getObject({
                    Bucket: BUCKET_NAME,
                    Key: key
                }).createReadStream();
                fs.mkdirSync(`output-folder/${eventId}`, { recursive: true })
                const writePath = `output-folder/${eventId}/${path.basename(key)}`;
                await writeToDisk(readStream, writePath, eventId);
            }
        });
        await Promise.all(promises);
    }catch (error) {
        console.error("error in catch block: ", err);
    } finally {
        connection.close();
    }
}
main();