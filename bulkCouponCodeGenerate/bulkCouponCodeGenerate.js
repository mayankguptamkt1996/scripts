/* 
Doc link - https://wiki.mypaytm.com/pages/viewpage.action?pageId=384335153

this script is used to replicate the given coupon code (given in csv) same as the sample coupon code. 
*/

const mongodb = require("mongodb");
const _ = require("lodash");
const fs = require('fs');
const converter = require('json-2-csv');
const MongoClient = mongodb.MongoClient;
var csvjson = require('csvjson');

const COUPON_CODE = "TX7ZM";
const COUNT = 2;

var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};

const main = async () => {
    // // PROD - Connection String
    //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

   // //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

    const connection = await MongoClient.connect(connectionString);
    const core = connection.db('insidercore');
    const Coupons = core.collection("coupons");

    try {
        const protoCoupon = (await Coupons.find({ code: COUPON_CODE }).toArray())[0];

        var file_data = fs.readFileSync('input.csv', { encoding: 'utf8' });
        const csvData = csvjson.toObject(file_data, options);

        //iterate one by one to generate the coupn code
        for(i = 0; i < csvData.length; i++){

            //copy the fields of coupon_code to couponDocs
            const couponDocs = _.times(COUNT).splice(1).map(count => ({
                ...protoCoupon,
                _id: undefined,
                code: csvData[i].code
            }));

            //converting couponDocs(json) into csv format
            converter.json2csv(couponDocs.map(e => _.pick(e, 'code')), (err, csv) => {
                if (err) {
                    throw err;
                }
                
                let csvData = csv.split("\n");
                fs.appendFile('couponOutput.csv', csvData[1]+"\n", function (err) {
                    if (err) throw err;
                    console.log(csvData[1]);
                });
                 
            });
     
            //pushing into db
            await Coupons.insertMany(couponDocs)
        }
    } catch (e) {
        console.error(e);
    } finally {
        await connection.close();
    }
}

main()
    .then(() => { console.log('done'); process.exit(1) });