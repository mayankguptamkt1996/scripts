/**
 * Steps for setting up pre_printed tickets (LUCKNOW) :
Add behaves_like : "seated" to all items
Add pre_printed : true to all items
Seed whitelist with pregenerated barcodes for each itemid for bothe type sale and complimentary
Seed should have is_used : false and if we want to skip validation script like we did in kolkata mark them valid : true
Map call makes ticket_name on whitelist doc the name of the inventory doc. So if u want to keep a track of all the seats, then seed should have actual mapping of seat number => barcode, otherwise we can add any random values der and have  barcode => inventory mapping for tracking.
Once done, on verify screen of logistics scan barcode on top bar.

Doc Link - https://wiki.mypaytm.com/display/INSIDER/Documentation+-Barcode+Mapping+whitelist+upsert

 */

const mongodb = require("mongodb");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const parse = require("csv-parse/lib/sync");

const emails = [];

const blacklist = [];

let unregisteredIds = [];

// TODO Uncomment request body and fill details

(async () => {
  // const connectionString = `mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@db1.stage.insider.in:27017/admin?readPreference=primary`;
  const connectionString =
    "mongodb://" +
    process.env.MONGODB_USERNAME +
    ":" +
    process.env.MONGODB_PASSWORD +
    "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

  connection = await MongoClient.connect(connectionString);
  const db = connection.db("insiderlogistics");

  const unique_core_items = [];
  try {
    const fileName = "items.csv";
    var data = parse(fs.readFileSync(path.join(__dirname, `${fileName}`)), {
      columns: true,
    });

    const arrayToInsert = data.map((datum) => {
      if (!unique_core_items.includes(datum["item id"])) {
        unique_core_items.push(datum["item id"]);
      }
      const dataObj = {
        barcode: datum["barcode"],
        core_item_id: ObjectId(datum["item id"]),
        blocked: false,
        valid: true, 
        is_used: false,
        discount_type: "sale",
        ticket_name: `${datum["item_name"]}`, // either item name or <row>-<seat_no> please verify the column name from the sample csv
        timestamp_added: new Date(),
        timestamp_modified: new Date(),
      };
      return dataObj;
    });

    // Uncomment the below line to insert the whitelist in to DB
    await db.collection('whitelists').insertMany(arrayToInsert);

    console.log({ arrayToInsert });
    console.log({ unique_core_items });
  } catch (e) {
    console.error(e);
  } finally {
    console.log("closing connection");
    connection.close();
  }
})();
