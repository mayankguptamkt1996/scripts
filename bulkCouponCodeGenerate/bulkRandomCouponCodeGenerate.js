/* 
Doc link - https://wiki.mypaytm.com/pages/viewpage.action?pageId=384335153

this script will generate random coupon code similar as given sample code.
*/

const mongodb = require("mongodb");
const _ = require("lodash");
const fs = require('fs');
const converter = require('json-2-csv');
const MongoClient = mongodb.MongoClient;

const COUPON_CODE = "9XEG4NPY";
// const PREFIX = "JSD"
const COUNT = 2;

const main = async () => {
    // // PROD - Connection String
    //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

    // //Staging - Connection String
    // const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@localhost:27018/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false";
    const connection = await MongoClient.connect(connectionString);
    const core = connection.db('insidercore');
    const Coupons = core.collection("coupons");

    //generating random string
    var generateRandomString = function generateRandomString (howMany, chars) {
        chars = chars
            || "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var rnd   = require('crypto').randomBytes(howMany),
            value = new Array(howMany),
            len   = chars.length;
        for (var i = 0; i < howMany; i++) {
            value[i] = chars[rnd[i] % len];
        }
        return value.join('');
    };

    //genrating random code with required length
    var generateRandomCouponCode = function generateRandomCouponCode () {
        var length =  8;
        var chars = "ABCDEFGHJKLMNPQRSTWXYZ23456789";
        return generateRandomString(length, chars);

    }

    try {
        const protoCoupon = (await Coupons.find({ code: COUPON_CODE }).toArray())[0];

        //copy the fields of coupon_code to couponDocs
        const couponDocs = _.times(COUNT).splice(1).map(count => ({
            ...protoCoupon,
            _id: undefined,
            code: generateRandomCouponCode()
        }));

        //converting couponDocs(json) into csv format
        converter.json2csv(couponDocs.map(e => _.pick(e, 'code')), (err, csv) => {
            if (err) {
                throw err;
            }
            fs.writeFileSync('couponOutput.csv', csv);
            
        });

        //pushing into db
        await Coupons.insertMany(couponDocs)
    } catch (e) {
        console.error(e);
    } finally {
        await connection.close();
    }

}

main()
    .then(() => { console.log('done'); process.exit(1) });