/** This Script helps you to download PDF's of the DE tickets
 * Please refer the readme file for the context for the same 
 */

const aws = require('aws-sdk');
const mongo = require('mongodb');
const papa = require('papaparse');
const fs = require('fs-extra');
const bluebird = require('bluebird');
const _ = require('lodash');

//connection string
const connectionString =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

const asyncParse = (path) => new Promise((resolve, reject) => papa.parse(fs.createReadStream(path), { header: true, skipEmptyLines: true, complete: e => resolve(e.data), error: reject }));

aws.config.update({
    // accessKeyId: "AKIAI5OPC5GIXYA6NQZQ",
    // secretAccessKey: "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",
    "region": "ap-south-1"
});

// const createDirectoriesByNameEmail = (invs) => {
//     const groupedInvs = _.groupBy(invs, inv => {
//         return `${inv['Event Name']}_${inv['Email']}`;
//     });

//     _.mapKeys(groupedInvs, (value, key) => {
//         fs.mkdirpSync(`tickets2/${key}`);
//     });
// }

const getTicketNameMap = async (invs, SoldInventory) => {
    const results = await SoldInventory.find({ shortcode: { $in: _.map(invs, 'Shortcode') } }, { projection: { digital_ticket_name: 1, shortcode: 1 } }).toArray();
    const eticketNameMap = _.chain(results).groupBy('shortcode').mapValues('0.digital_ticket_name').value();
    return eticketNameMap;
}

const chunkedIteration = async (invs, cb) => {
    await bluebird.mapSeries(_.chunk(invs, 10), chunkedInvs => {
        return Promise.all(chunkedInvs.map(cb));
    });
}

const writeToDisk = async (readStream, writePath, shortcode) => {
    return new Promise((resolve, reject) => {
        readStream.on('error', () => {
            console.log(`Error in downloading pdf for ${shortcode}`);
            resolve();
        })
        // const dirName = `${inv['Event Name']}_${inv['Email']}`;

        // const writeStream = fs.createWriteStream(`tickets/${dirName}/${inv['Shortcode']}.pdf`);
        const writeStream = fs.createWriteStream(writePath);

        const pipedStream = readStream.pipe(writeStream);

        pipedStream.on('close', (e) => {
            if (e) {
                console.log(`Error in downloading pdf for ${inv}`);
                return reject(e);
            }

            resolve();
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
        const invs = await asyncParse('./input-file-name.csv');

        const eticketNameMap = await getTicketNameMap(invs, SoldInventory);

        // createDirectoriesByNameEmail(invs);
        console.log("================= Total Inventories =====================");
        console.log(`Total invs: ${invs.length}`)

        await chunkedIteration(invs, async inv => {
            console.log('fetching for SHORTCODE : ' + inv.Shortcode);
            
            //reading the PDFs in S3 
            try {
                const readStream = S3.getObject({
                    Bucket: 'queuemaster-tickets-mb',
                    Key: `${eticketNameMap[inv.Shortcode]}.pdf`
                }).createReadStream();

                const writePath = `output-folder/${inv['Shortcode']}.pdf`;

                return writeToDisk(readStream, writePath, inv.Shortcode);

            } catch (error) {
                console.log(`Something went wrong while fetching ${inv}`);
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
