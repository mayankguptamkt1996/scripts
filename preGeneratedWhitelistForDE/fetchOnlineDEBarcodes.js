/**
 * Turnstiles whitelist that is a combination of barcodes and QR codes
 * This is a hack for CSK 2023
 * Different types of tickets and what the whitelist should pick for them
 * this will only fetch the tickets which type is online
 * - pick barcodes - these tickets include tickets generated after the pregenerated whitelist push
 * Tickets sold on Insider
 * - pick qr codes - these tickets includes tickets generated after the pregenerated whitelist push
 *  Additional whitelist
 * Get all of the additional whitelist pre-generated for an item and add it to the list 
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
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

const eventId = "675293e1ee38f5e82e8867af";
//const match_no = ''

function timeStamp(message) {
  console.log("[" + new Date().toISOString() + "] -", message);
}

async function main() {
  let connection;

  try {
    connection = await dbClient.connect(connectionString);
    const logisticsDB = connection.db("insiderlogistics");
    const coreDB = connection.db("insidercore");
    const Barcodes = logisticsDB.collection("barcodes");
    const Whitelists = logisticsDB.collection("whitelists");
    const Items = coreDB.collection("items");
    const SI = coreDB.collection("soldinventories");

    const items = await Items.find({
      "parent.parent_id": ObjectId(eventId),
    }).toArray();

    const itemsMap = {};

    _.map(items, (item) => {
      const isPhased = !!item.phaseGroup;
      const itemIdentifier = isPhased ? item.phaseGroup._id : item._id;
      const itemName = isPhased ? item.phaseGroup.name : item.name;
      if (!_.isEmpty(itemsMap[itemIdentifier])) {
        itemsMap[itemIdentifier]["items"].push(item._id);
      } else {
        itemsMap[itemIdentifier] = {};
        itemsMap[itemIdentifier]["id"] = itemIdentifier;
        itemsMap[itemIdentifier]["name"] = itemName;
        itemsMap[itemIdentifier]["items"] = [];
        itemsMap[itemIdentifier]["items"].push(item._id);
      }
    });

    // console.log({ itemsMap, json: JSON.stringify(itemsMap) });
    const whitelistDump = [];

    const res = await Promise.map(
      _.values(itemsMap),
      async (itemGroup) => {
        timeStamp({ itemGroup });

        const { name, items } = itemGroup;

        const onlineInvs = await SI.find({
          type: "online",
          item_id: { $in: _.map(items, ObjectId) },
          status: {$ne: 'refunded'}
        }).toArray();

        const barcodes = await Barcodes.find({
          inventory_id: { $in: _.map(onlineInvs, "_id") },
          item_id: { $in: _.map(items, ObjectId) },
          active: true,
        }).toArray();

        _.map(barcodes, (barcode) => {
          const { delivery_email, vendorDetails, shortcode } = barcode.payload;
          let barcodeString = barcode.barcode;
 
          if (barcode.discount_type == "complimentary") {
            const scannerBarcodeData = {
              event_id: barcode.event_id.toString(),
              item_id: barcode.item_id.toString(),
              item_name: name,
              sector: vendorDetails.vendor_data.sector,
              barcode: barcode.barcode,
              "Is Used": 1,
              "Is Active": 1,
              shortcode: shortcode,
              "Is Blacklisted": 0,
              "Stand Name": name,
            };
            whitelistDump.push(scannerBarcodeData);
          } else {
            const scannerData = {
              event_id: barcode.event_id.toString(),
              item_id: barcode.item_id.toString(),
              item_name: name,
              sector: vendorDetails.vendor_data.sector,
              barcode: barcodeString,
              "Is Used": 1,
              "Is Active": 1,
              shortcode: shortcode,
              "Is Blacklisted": 0,
              "Stand Name": name,
            };
            whitelistDump.push(scannerData);
          }
        });

        return true;
      },
      {
        concurrency: 1,
      }
    );

    if (whitelistDump.length > 0) {
      timeStamp({ count: whitelistDump.length });

      console.log("****");
      timeStamp("WRITING TO FILE");
      let rowsData = papaparse.unparse(whitelistDump);
      fs.writeFileSync(
        `./whitelist_exports/csk_online_${new Date().toISOString()}.csv`,
        rowsData
      );
    }

    timeStamp({ res });
  } catch (e) {
    timeStamp({ e });
  } finally {
    timeStamp("closing connection");
    connection.close();
  }
}

main().catch(console.error);
