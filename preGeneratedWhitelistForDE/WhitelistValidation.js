/**
 * Doc link - https://wiki.mypaytm.com/pages/viewpage.action?pageId=483660917
Logic for verifying the whitelist - write a script that does this -
Write a script that accepts the whitelist csv as input
Loop over every row in CSV and count the rows per item. There should be 3 counts for each item:
      a. number of rows for an item that have inventory id present 
      b. number of rows for an item that have no inventory linked i.e NA is displayed in script 
      c. total rows for an item - ideally should be sum of a and b 

Once we have these numbers, run an aggregate on mongo db to get valid (active:true) inventory count per item from Barcodes collection for an event
This count should match with count in point a for every item  

Fetch valid (is_used false, is_active true and pregenerated true) whitelist count per item for an event
This count should match with count in point b for every item
The number of items in rows should match the number of items returned by aggregation

 */
const mongodb = require("mongodb");
const _ = require("lodash");
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const Promise = require("bluebird");
const papa = require("papaparse");
const fs = require("fs-extra");
//const eventId = "64f72749ee15491ebbd6d0fb"; // staging
const eventId = "654380acbdbe2a000842a92d";

// //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

  // //Prod - Connection String
  const connectionString =
  "mongodb://" +
  process.env.MONGODB_USERNAME +
  ":" +
  process.env.MONGODB_PASSWORD +
  "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

/**
 * Asynchronously parses the contents of the given file using PapaParse library.
 *
 * @param {string} fileName - The name of the file to be parsed
 * @return {Promise} A Promise that resolves with the parsed data
 */
const asyncParse = (fileName) =>
  new Promise((resolve) =>
    papa.parse(fs.readFileSync(fileName, "utf8"), {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
      complete: resolve,
    })
  );

  /**
 * Fetches the item IDs from the provided barcodes and returns an object containing the frequency of each item ID.
 *
 * @param {Array} Barcodes - An array of barcode strings.
 * @return {Object} An object containing the frequency of each item ID.
 */
const fetchItemidsFromBarcodes = async (Barcodes) => {
  const pipeline = [
    {
      $match: {
        event_id: ObjectId(eventId),
        active: true,
      },
    },
    {
      $group: {
        _id: "$item_id",
        count: { $sum: 1 },
      },
    },
  ];
  const results = await Barcodes.aggregate(pipeline).toArray();
  const itemsFrequency = _.chain(results)
    .keyBy("_id")
    .mapValues("count")
    .value();
  return itemsFrequency;
};

/**
 * Fetches item Ids from the whitelist and returns the frequency of each item.
 *
 * @param {Array} Whitelists - collection of whitelists
 * @param {Array} itemArr - array of item IDs
 * @return {Object} object containing the frequency of each item in the whitelist
 */
const fetchItemIdsFromWhitelist = async (Whitelists, itemArr) => {
  const pipeline = [
    {
      $match: {
        core_item_id: {
          $in: _.map(itemArr, ObjectId),
        },
        valid: true,
        is_used: false,
        pregenerated: true,
      },
    },
    {
      $group: {
        _id: "$core_item_id",
        count: { $sum: 1 },
      },
    },
  ];
  const results = await Whitelists.aggregate(pipeline).toArray();
  const whitelistFrequency = _.chain(results)
    .keyBy("_id")
    .mapValues("count")
    .value();
  return whitelistFrequency;
};

fetch = async () => {
  let itemsFrequency;
  let connection;
  let whitelitsFrequency;
  try {
    connection = await MongoClient.connect(connectionString);
    const logisticsDB = connection.db("insiderlogistics");
    const coreDB = connection.db("insidercore");
    const Whitelists = logisticsDB.collection("whitelists");
    const Items = coreDB.collection("items");
    const Barcodes = logisticsDB.collection("barcodes");

    const items = await Items.find(
      { "parent.parent_id": ObjectId(eventId) },
      { _id: 1 }
    ).toArray();
    const itemArr = items.map((x) => x._id.toString());

    itemsFrequency = await fetchItemidsFromBarcodes(Barcodes);
    whitelitsFrequency = await fetchItemIdsFromWhitelist(Whitelists, itemArr);
  } catch (error) {
    console.log(error);
  } finally {
    connection.close();
  }

  const { data: results } = await asyncParse("input-whitelist.csv");
  console.log("Total rows in CSV -->", results.length);
  // 1. A map with key as item_id and value as item_id count
  const itemIdCountMap = new Map();
  // 2.  A map with key as item_id and value as shortcode count
  const rowsWithShortcode = new Map();
  // 3. A map with key as item_id and value as shortcode count
  const rowsWithNAShortcode = new Map();

  results.forEach((result) => {
    const itemId = result.item_id;
    const hasShortcode = result.shortcode !== "NA";

    // Increment item_id count in the map
    if (itemIdCountMap.has(itemId)) {
      itemIdCountMap.set(itemId, itemIdCountMap.get(itemId) + 1);
    } else {
      itemIdCountMap.set(itemId, 1);
    }

    if (hasShortcode) {
      if (rowsWithShortcode.has(itemId)) {
        rowsWithShortcode.set(itemId, rowsWithShortcode.get(itemId) + 1);
      } else {
        rowsWithShortcode.set(itemId, 1);
      }
    } else {
      if (rowsWithNAShortcode.has(itemId)) {
        rowsWithNAShortcode.set(itemId, rowsWithNAShortcode.get(itemId) + 1);
      } else {
        rowsWithNAShortcode.set(itemId, 1);
      }
    }
  });

  const itemListData = [];
  
  itemIdCountMap.forEach((value, itemId) => {
    const totalItemIdCount = value;
    const itemIdCountWithShortcode = rowsWithShortcode.get(itemId) || 0;
    const itemIdCountWithoutShortcode = rowsWithNAShortcode.get(itemId) || 0;

    // Prepare the item list data
    const itemData = {
      "Item Id": itemId,
      "Valid shortcodes [CSV] (A)": itemIdCountWithShortcode,
      "Invalid NA shortcode [CSV] (B)": itemIdCountWithoutShortcode,
      "CSV Total rows (A+B)": totalItemIdCount,
      "DB(Barcodes) valid shortcode(==A)": itemsFrequency[itemId] ?? 0,
      "Valid shortcode Matched":
        itemsFrequency[itemId] === itemIdCountWithShortcode ? "TRUE" : "FALSE",
      "DB(Whitelist) invalid NA shortcode (==B)":
        whitelitsFrequency[itemId] ?? 0,
      "Invalid NA shortcode Matched":
        whitelitsFrequency[itemId] === itemIdCountWithoutShortcode
          ? "TRUE"
          : "FALSE",
      "Total DB count": itemsFrequency[itemId] + whitelitsFrequency[itemId],
      "CSV whitelist count === DB whitelist count":
        itemsFrequency[itemId] + whitelitsFrequency[itemId] === totalItemIdCount
          ? "TRUE"
          : "FALSE",
    };
    itemListData.push(itemData);
  });

  if (itemListData.length > 0) {
    console.log("Writing to File.....");

    // Write data to CSV
    let rowsData = papa.unparse(itemListData);
    fs.writeFileSync(
      `./validation_exports/results_${new Date().toISOString()}.csv`,
      rowsData
    );
  }
};

fetch();
