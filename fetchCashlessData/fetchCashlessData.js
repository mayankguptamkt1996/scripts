/**
 * Script to fetch the cashless data from our core db
 */

const _ = require("lodash");
const Promise = require("bluebird");
const papaparse = require("papaparse");
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const fs = require("fs");
const { count, time } = require("console");

// //Staging - Connection String
//const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

// //Prod - Connection String
const connectionString =
  "mongodb://" +
  process.env.MONGODB_USERNAME +
  ":" +
  process.env.MONGODB_PASSWORD +
  "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

// for event Id  
const eventId = "672c914a58285fd7ad083b68";

// // for item Id
// const itemId = "668f91eee368f0467ee45b41";


function timeStamp(message) {
  console.log("[" + new Date().toISOString() + "] -", message);
}

async function main() {
  let connection;

  try {
    connection = await dbClient.connect(connectionString);
    const logisticsDB = connection.db("insiderlogistics");
    const coreDB = connection.db("insidercore");
    const awbCol = logisticsDB.collection("awbs");
    const SI = coreDB.collection("soldinventories");
    const txns = coreDB.collection("transactions");

    const inventories = await SI.find({
      event_id: ObjectId(eventId), // use item_id for item_id specific
      status: { $ne: "refunded" },
    }).toArray();

    const transactionIds = await txns
      .find({
        _id: { $in: _.map(inventories, "transaction_id") },
      })
      .toArray();

    const awbs = await awbCol
      .find({
        transaction_id: { $in: _.map(transactionIds, "_id") },
      })
      .toArray();

    const outputData = [];

    _.map(inventories, (inventoryId) => {
      const {
        transaction_id,
        item_id,
        type,
        delivery_type,
        shortcode,
        item_type,
        delivery_email,
        delivery_tel,
        delivery_name,
        z_order_id,
        z_shortcode,
        item_name
      } = inventoryId;

      const transactionItem = transactionIds.find(
        (item) => item._id.toString() === transaction_id.toString()
      );
      const awbItem = awbs.find(
        (item) => item.transaction_id.toString() === transaction_id.toString()
      );

      const fetchedData = {
        "Transaction ID": transactionItem._id.toString(),
        "Sold Inventory ID": inventoryId._id.toString(),
        "Item ID": item_id.toString(),
        "Transaction Type": type,
        "Delivery Type": delivery_type,
        "Shortcode": shortcode,
        "Awb": awbItem ? awbItem.awb : "AWB not Generated",
        "Transaction Time": transactionItem.timestamp_added,
        "Ticket Type": item_type,
        "Buyer Email":delivery_email,
        "Buyer Name":delivery_name,
        "Buyer Phone":delivery_tel,
        "z_order_id":z_order_id ? z_order_id : "NA",
        "z_shortcode":z_shortcode? z_shortcode : "NA",
        "item_name":item_name 
        //biling_email: transactionItem.billing_email,
        //billing_name: transactionItem.billing_name,
        //billing_tel: transactionItem.billing_tel,
      };
      outputData.push(fetchedData);
    });

    if (outputData.length > 0) {
      timeStamp({ count: outputData.length });

      console.log("****");
      timeStamp("WRITING TO FILE");
      let rowsData = papaparse.unparse(outputData);
      fs.writeFileSync(
        `./output_folder/event_data_${new Date().toISOString()}.csv`,
        rowsData
      );
    }
  } catch (e) {
    timeStamp({ e });
  } finally {
    timeStamp("closing connection");
    connection.close();
  }
}

main().catch(console.error);
