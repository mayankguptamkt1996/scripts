/* Doc link - https://wiki.mypaytm.com/display/INSIDER/Documentation+-+Unlock+codes+Setup 
This script is used for inserting unlock-codes in lists collection

*/

const mongodb = require("mongodb");
const _ = require("lodash");
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const Promise = require("bluebird");
const papa = require("papaparse");
const fs = require("fs-extra");

Promise.promisifyAll(mongodb);

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
 *
 * @param {mongodb.Collection} Item
 * @param {mongodb.Collection} List
 * @param {*} list_name
 * @param {*} idList
 * @param {*} codes
 * @param {*} limit
 * @param {*} itemRestrictions
 */
const seedData = async (
  Item,
  List,
  list_name,
  idList,
  codes,
  limit,
  itemRestrictions
) => {
  const uniqueCodes = (
    await Promise.all(
      codes.map((code) => {
        return {
          count: List.countDocuments({ unlock_key: code, list_name }),
          code,
        };
      })
    )
  )
    .filter((e) => e.count === 0)
    .map((e) => e.code);

  await List.insertMany(
    _.map(codes, (code) => ({
      is_available: true, // if you don't want the codes to be accessible on admin/website, set this flag to false
      unlock_key: String(code),
      list_name: list_name,
      redeemAgainstItemIds: idList,
      maxRedemptionCount: limit,
      info: {
        inventory_ids: [],
      },
      transaction_restriction: ["*"],
      item_restrictions: itemRestrictions,
    }))
  );

  await Promise.map(
    idList,
    (item_id) => {
      return Item.update(
        {
          _id: item_id,
        },
        {
          $set: {
            item_params_validation_url: `https://insider.in/unlock-check/${list_name}/${item_id.toString()}`,
            item_params: [
              {
                values: [],
                is_required: true,
                name: "unlock_key",
                input_type: "text",
                display_text: "Enter your code",
              },
            ],
          },
        },
        {
          upsert: false,
          multi: false,
        }
      );
    },
    { concurrency: 4 }
  );
};

(async () => {
  let connection;

  try {
    // Read from csv
    const { data: Codes } = await asyncParse("input-codes.csv");
    const connectionString =
      "mongodb://" +
      process.env.MONGODB_USERNAME +
      ":" +
      process.env.MONGODB_PASSWORD +
      "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";
    connection = await MongoClient.connect(connectionString);
    const core = connection.db("insidercore");
    const Item = core.collection("items");
    const List = core.collection("lists");

    await seedData(
      Item,
      List,
      "TestCode-Member-list",
      [
        // pav
        new ObjectId("62835f55c17bc47be55ffa1e"),
        // a
        // ObjectId("62835f96c17bc47be55ffa2b"),
        // b
        //ObjectId("62835fd3c17bc47be55ffa36"),
      ],
      Codes.map((e) => e["Codes"]), // name of the column that has the codes, eg: Codes.map(e => e['Shortcodes']),
      3,
      [
        {
          id: new ObjectId("62835f55c17bc47be55ffa1e"),
          restrictions: {
            maxLimit: 2,
          },
        },
      ]
    );

    console.log("done");
  } catch (error) {
    console.error(error);
  } finally {
    connection.close();
  }
})().catch(console.error);
