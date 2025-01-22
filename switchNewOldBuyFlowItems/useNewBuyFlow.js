const mongodb = require("mongodb");
const fs = require("fs");
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
var csvjson = require("csvjson");
const Promise = require("bluebird");
var options = {
  delimiter: ",", // optional
  quote: null, // optional
};

const prodMongoUrl =
  "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

const stageMongoUrl =
  "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin"

const ENV = process.env.NODE_ENV ? process.env.NODE_ENV : 'stage';

const main = async () => {

  let responseCsv = [];
  let errorCsv = [];
  const connectionString = ENV === 'prod' ? prodMongoUrl: stageMongoUrl;
  console.log("STARTING SWITCH TO NEW BUY FLOW for ENV =", ENV);

  const connection = await MongoClient.connect(connectionString);
  const events = connection.db("insidercore");
  const items = events.collection("items");
  try {
    var file_data = fs.readFileSync("input.csv", { encoding: "utf8" });
    const csvData = csvjson.toSchemaObject(file_data, options);

    await Promise.map(csvData, async (csvRow) => {
      const oldBuyFlowAddOn = csvRow.oldBuyFlowAddOn;
      const newBuyFlowAddOn =  csvRow.newBuyFlowAddOn;
      const eventId = csvRow.eventId;
      const itemId = csvRow.itemId
        try {
          await items.updateOne({ _id: ObjectId(itemId) }, { $set: { addon_items: newBuyFlowAddOn.map(i=> ObjectId(i)) } });
          console.log(`Updated add ons for ${itemId} to NEW Buy Flow: ` + JSON.stringify(newBuyFlowAddOn));
          responseCsv.push({
            eventId, itemId, oldBuyFlowAddOn, newBuyFlowAddOn, status: "Updated"
          });
        } catch (e) {
         console.log(`Failed to update add ons for ${itemId}`, e);
          errorCsv.push({
             eventId, itemId, oldBuyFlowAddOn, newBuyFlowAddOn, status: "Failed", error: JSON.stringify(e)
          });
        }



    });
  } catch (e) {
    console.log(e);
  } finally {
        // write the response CSV file
    const responseCsvOptions = { headers: "keys" };
    const responseCsvFinal = csvjson.toCSV(
      responseCsv,
      responseCsvOptions
    );
    fs.writeFileSync(`./new-success-response-${new Date().getTime()}.csv`, responseCsvFinal);

    // write the error CSV file
    const errorCsvOptions = { headers: "keys" };
    const errorCsvFinal = csvjson.toCSV(errorCsv, errorCsvOptions);
    fs.writeFileSync(`./new-error-response-${new Date().getTime()}.csv`, errorCsvFinal);

    connection.close();
  }
};
main().then(() => {
  process.exit(1);
});
