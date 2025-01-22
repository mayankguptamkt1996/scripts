/**
This script fetches delivery_email and billin_email from txn collection on the basis of txn_id.
This can be done directly from db but script can be used if we have request over 0.1 M(1 lakh) records to fetch.
 */

const mongodb = require("mongodb");
const _ = require("lodash");
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const Promise = require("bluebird");
const papa = require("papaparse");
const fs = require("fs-extra");

const asyncParse = (fileName) =>
  new Promise((resolve) =>
    papa.parse(fs.readFileSync(fileName, "utf8"), {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
      complete: resolve,
    })
  );

const fetchEmailId = async (Txn, txnArr) => {
  const pipeline = [
    {
      $match: {
        _id: {
          $in: _.map(txnArr, ObjectId),
        },
      },
    },
    {
      $project: {
        _id: 1,
        billing_email: 1,
        delivery_email: 1,
      },
    },
  ];
  const results = await Txn.aggregate(pipeline).toArray();
  return results;
};

(async () => {
  // //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";
  
  // //Prod - Connection String
  const connectionString =
    "mongodb://" +
    process.env.MONGODB_USERNAME +
    ":" +
    process.env.MONGODB_PASSWORD +
    "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

  connection = await MongoClient.connect(connectionString);
  const coreDB = connection.db("insidercore");
  const Txn = coreDB.collection("transactions");

  try {
    // Provide the filename here
    const { data: results } = await asyncParse("txn_ids.csv");

    const txnIds = results.map(({ transaction_id }) =>
      ObjectId(transaction_id).toString()
    );
    const output = await fetchEmailId(Txn, txnIds);
    if (output.length > 0) {
      console.log("Writing to File.....");
      let rowsData = papa.unparse(output);
      fs.writeFileSync(`./results.csv`, rowsData);
    }
  } catch (e) {
    console.error(e);
  } finally {
    console.log("closing connection");
    connection.close();
  }
})();
