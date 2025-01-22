/* 
This script is used to debit the stash in user's account based on user's email id.
This is rare case we don't debit the stash from the user's account.Confirm with techops/event-devs before running the script.  

*/

const mongodb = require("mongodb");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const Promise = require("bluebird");
var csvjson = require("csvjson");
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const request = require("request-promise");
const ObjectsToCsv = require("objects-to-csv");

var options = {
  delimiter: ",", // optional
  quote: '"', // optional
};

let unregisteredIds = [];

const debitWallet = async (email, user_id, amount) => {
  var options = {
    method: "POST",
    headers: {
      "api-key": "", // paste your api-key from tracks collection
      "Cache-Control": "no-cache",
      "Content-Type": "application/json; charset=utf-8",
    },
    uri: "http://internal.insider.in/offer/debitWallet", // debit API called
    body: {
      userId: user_id,
      amount: amount,
      issuedByEmail: "<email_id>", //add issued email id (user who is running the script)
      debitReason:
        "As per our email communication, stash credited to your account on or before March 2020 has expired.", //this message can be modified based on why we want to debit the stash
    },
    json: true, // Automatically stringifies the body to JSON
  };

  const response = await request(options);
  console.log(email + " user: " + user_id + " AMOUNT:" + amount);
  return response;
};

// //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

//Prod url
const mongoUrl =
  "mongodb://" +
  process.env.MONGODB_USERNAME +
  ":" +
  process.env.MONGODB_PASSWORD +
  "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

const FILE_NAME = "input.csv"; //paste the correct input csv name
const main = async () => {
  let connection;
  const connectionString = mongoUrl;
  let csvData;

  connection = await MongoClient.connect(connectionString);
  const db = await connection.db("insidercore");
  try {
    var file_data = fs.readFileSync(FILE_NAME, "utf8");
    csvData = csvjson.toObject(file_data, options);
    await Promise.mapSeries(
      csvData,
      async (thisCsvData, idx) => {
        var csvamount = Number(thisCsvData.amount_to_deduct);
        var csvemail = String(thisCsvData.email);
        const email = csvemail;
        const amount = csvamount;
        let user = await db.collection("users").findOne(
          {
            email: email,
          },
          {
            _id: 1,
          }
        );
        if (!user) {
          unregisteredIds.push(email);
        } else {
          try {
            const apiResult = await debitWallet(
              email,
              user._id.toString(),
              amount
            ); // passing the fetched userid along with email,amount
            if (apiResult.result !== "ok") {
              csvData[idx]["Status"] = "FAIL";
              csvData[idx]["Message"] = JSON.stringify(apiResult.result);
              csvData[idx]["Error"] = JSON.stringify(apiResult);
            } else {
              csvData[idx]["Status"] = "SUCCESS";
              csvData[idx]["Message"] = "";
              csvData[idx]["Error"] = "";
            }
          } catch (e) {
            console.log("Error occured: ", e.message);
            csvData[idx]["Status"] = "FAIL";
            csvData[idx]["Message"] = _.get(
              e,
              "response.body.data.body.result",
              e.message
            );
            csvData[idx]["Error"] = JSON.stringify(e);
          }
        }
        if (unregisteredIds.length > 0) {
          console.log("Unregistered Ids"); //if there is any unregister id it will log here
          for (const id of unregisteredIds) {
            console.log(id);
          }
        }
      },
      { concurrency: 20 }
    );
  } catch (e) {
    console.error(e);
  } finally {
    console.log("closing connection");
    connection.close();
    const csv = new ObjectsToCsv(csvData);
    const __dirname = "output"; // ouput directory name
    await csv.toDisk(path.join(__dirname, `/debit-stash-response.csv`), {
      append: false,
    });
  }
};
main();
