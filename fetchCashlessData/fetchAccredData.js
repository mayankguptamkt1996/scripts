/**
 * Script to fetch the accred data from our core db only for delivery tickets
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
const eventId = "66ba0031776c3286aa1209f1";

// // for item Id
//const itemId = "";


function timeStamp(message) {
  console.log("[" + new Date().toISOString() + "] -", message);
}

async function main() {
  let connection;

  try {
    connection = await dbClient.connect(connectionString);
    const logisticsDB = connection.db("insiderlogistics");
    const coreDB = connection.db("insidercore");
    const item = coreDB.collection("items");
    const SI = coreDB.collection("soldinventories");

    const items = await item.find({
        "parent.parent_id": ObjectId(eventId), // use item_id for item_id specific
        //item_id:ObjectId(itemId),
    }).toArray();

    const inventories = await SI.find({
        event_id: ObjectId(eventId), // use item_id for item_id specific
        //item_id:ObjectId(itemId),
        timestamp_added:{
          $gte:new Date('2024-08-28T17:30:00.000Z'),
          $lt:new Date('2024-08-29T17:30:00.000Z')
        },
        status: { $ne: "refunded" },
        delivery_type: { $in: ["delivery_or_pickup", "delivery_only"] },
		    delivery_details: { $exists: true },
    }).toArray();

    const outputData = [];

    _.map(inventories, (inventoryId) => {
      const {
        transaction_id,
        item_id,
        shortcode,
        delivery_email,
        delivery_tel,
        delivery_name,
        timestamp_added
      } = inventoryId;

      let govtId = null;
      let name = null;
      let photo = null;
      let student_id = null;

      //this will fetch the params in a order 
      //why we need this - because params are stored in random order 
      inventoryId.inventory_user_params.forEach(param => {
        if (param.name.includes('Govt')) { //this can be change according to the params name, please check db before you run
            govtId = param.value;
        } else if (param.name.includes('name')) { //this can be change according to the params name, please check db before you run
            name = param.value;
        } else if (param.name.includes('photo')) { //this can be change according to the params name, please check db before you run
            photo = param.value;
        } else if (param.name.includes('current')) { //this can be change according to the params name, please check db before you run
            student_id = param.value;
        }
      });

      let foundItem = items.find(it => it._id.toString() === item_id.toString());

      const fetchedData = {
        "first_name":name,
        "photo":photo,
        "id_proof":govtId,
        "student_id":student_id,
        "short_code":shortcode,
        "sold_inventory_id": inventoryId._id.toString(),
        "item_id": item_id.toString(),
        "transaction_id": transaction_id.toString(),
        "buyer_name":delivery_name,
        "buyer_email":delivery_email,
        "phone_no":delivery_tel,
        "Ticket name":foundItem.name,
        "transaction time":timestamp_added
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
