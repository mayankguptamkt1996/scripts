const mongodb = require("mongodb");
const fs = require("fs");
const MongoClient = mongodb.MongoClient;
var csvjson = require("csvjson");
const Promise = require("bluebird");
var options = {
  delimiter: ",", // optional
  quote: '"', // optional
};

const main = async () => {
  // Production - Connection String
  const connectionString =
    "mongodb://" +
    process.env.MONGODB_USERNAME +
    ":" +
    process.env.MONGODB_PASSWORD +
    "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

    // //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

  const connection = await MongoClient.connect(connectionString);
  const logistics = connection.db("insiderlogistics");
  const awbs = logistics.collection("awbs");
  const barcodes = logistics.collection("barcodes");

  let responseCsvForAwb = [];
  let errorCsvDataAwb = [];
  let responseCsvForBarcode = [];
  let errorCsvDataBarcode = [];

  try {
    var file_data = fs.readFileSync("input.csv", { encoding: "utf8" });
    const csvData = csvjson.toObject(file_data, options);
    let count = 0;

    //Iterating over each row in the csv and doing the update
    await Promise.map(csvData, async (csvRow) => {
      var oldawb = csvRow.oldawb;
      var newawb = csvRow.newawb;

      const awbFound = await awbs.findOne({ awb: oldawb });
      console.log(++count);
      
      if (awbFound) {
        try {
          await awbs.updateOne({ awb: oldawb }, { $set: { awb: newawb } });
          console.log("awb updated: " + oldawb);
          responseCsvForAwb.push({
            oldawb: oldawb,
            newawb: newawb,
            status: "updated",
          });
        } catch (e) {
          console.log("awb update failed");
          errorCsvDataAwb.push({
            oldawb: oldawb,
            newawb: newawb,
            status: "awb update failed",
          });
        }

        const awbFoundInBarcode = await barcodes
          .find({ awb: oldawb })
          .toArray();

        if (awbFoundInBarcode.length > 0) {
          try {
            await barcodes.updateMany(
              { awb: oldawb },
              { $set: { awb: newawb } }
            );
            console.log("awb updated in barcode: " + oldawb);
            responseCsvForBarcode.push({
              oldawb: oldawb,
              newawb: newawb,
              status: "barcode updated",
            });
          } catch (e) {
            console.log("barcode update failed");
            errorCsvDataBarcode.push({
              oldawb: oldawb,
              newawb: newawb,
              status: "barcode update failed",
            });
          }
        } else {
          errorCsvDataBarcode.push({
            oldawb: oldawb,
            newawb: newawb,
            status: "barcode not mapped",
          });
          console.log("barcode not mapped: " + oldawb);
        }

       
      } else {
        console.log("awb not found");
        errorCsvDataAwb.push({
          oldawb: oldawb,
          newawb: newawb,
          status: "awb not present",
        });
      }
    });
  } catch (e) {
    console.log(e);
  } finally {
    // write the response CSV file
    const responseCsvOptionsAWB = { headers: "keys" };
    const responseCsvAWB = csvjson.toCSV(
      responseCsvForAwb,
      responseCsvOptionsAWB
    );
    fs.writeFileSync(`./awb-response.csv`, responseCsvAWB);

    // write the error CSV file
    const errorCsvOptionsAWB = { headers: "keys" };
    const errorCsvAWB = csvjson.toCSV(errorCsvDataAwb, errorCsvOptionsAWB);
    fs.writeFileSync(`./error-awb-response.csv`, errorCsvAWB);

    // write the response CSV file
    const responseCsvOptionsBarcode = { headers: "keys" };
    const responseCsvBarcode = csvjson.toCSV(
      responseCsvForBarcode,
      responseCsvOptionsBarcode
    );
    fs.writeFileSync(`./barcode-response.csv`, responseCsvBarcode);

    // write the error CSV file
    const errorCsvOptionsBarcode = { headers: "keys" };
    const errorCsvBarcode = csvjson.toCSV(
      errorCsvDataBarcode,
      errorCsvOptionsBarcode
    );
    fs.writeFileSync(`./error-barcode-response.csv`, errorCsvBarcode);
    connection.close();
  }
};
main().then(() => {
  console.log("---- Find the response file -----");
  process.exit(1);
});
