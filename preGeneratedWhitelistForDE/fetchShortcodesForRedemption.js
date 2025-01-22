const _ = require('lodash');
const Promise = require('bluebird');
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const papaparse = require('papaparse');

const connectionString =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

function timeStamp(message){
    console.log ( '[' + new Date().toISOString() + '] -', message )
}

const filePath = '/turnstile_exports/Zomaland_Pune_Turnstile_Attendence_Day_2.csv'

// const filePath = '/turnstile_exports/temp.csv'

const eventId = '';

async function main () {
    let connection;
    let shortcodes = [];

    timeStamp('here');

    try {
        connection = await dbClient.connect(connectionString);
        const logisticsDB = connection.db("insiderlogistics");
        const Barcodes = logisticsDB.collection("barcodes");
        timeStamp('here2');

        const turnstileData = parse(fs.readFileSync(path.join(__dirname, filePath)), {columns : true});


        await Promise.map(turnstileData, async (data) => {
            if(Number(data['Entry Time']) < 1) {
                return Promise.resolve();
            }

            const barcode = data['Barcode'];

            if(!barcode) {
                return Promise.resolve();
            }

            console.log({ barcode });

            if(barcode.length <= 22) {
                const barcodeDoc = await Barcodes.findOne({
                    event_id: ObjectId(eventId),
                    barcode: barcode
                });

                if(barcodeDoc && barcodeDoc.payload && barcodeDoc.payload.shortcode) { 
                    shortcodes.push({
                        shortcode: barcodeDoc.payload.shortcode,
                        barcode
                    });
                }

            } else {
                const barcodeDoc = await Barcodes.findOne({
                    event_id: ObjectId(eventId),
                    qrcode: barcode
                });

                if(barcodeDoc && barcodeDoc.payload && barcodeDoc.payload.shortcode) { 
                    shortcodes.push({
                        shortcode: barcodeDoc.payload.shortcode,
                        barcode
                    });
                }

            }

            return Promise.resolve();
        }, {
            concurrency: 1
        })
        
    } catch(e) {
        timeStamp({ e });
    } finally {

        if(shortcodes.length > 0) {

            timeStamp({ count: shortcodes.length });

            console.log("****");
            timeStamp("WRITING TO FILE");
            let rowsData = papaparse.unparse(shortcodes);
            fs.writeFileSync(`./turnstile_exports/shortcodes_${new Date().toISOString()}.csv`,rowsData);
        }

        timeStamp("closing connection");
        connection.close();
        return Promise.resolve();
    }

}

main().catch(console.error);