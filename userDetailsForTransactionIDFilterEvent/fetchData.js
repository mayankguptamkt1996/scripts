/*
This script is used to fetch the user details for transaction_id filter event_id.
*/

const mongodb = require("mongodb");
const fs = require('fs');
const _ = require("lodash");
const MongoClient = mongodb.MongoClient;
const { ObjectId } = require('mongodb');
var csvjson = require('csvjson');
const Promise = require('bluebird');
const papaparse = require('papaparse');
var options = {
  delimiter: ',', // optional
  quote: '"' // optional
};

// EventIds for which we need data
const eventIds = [
  ObjectId('63f37cff4cb2880008216b69')
];

// PROD - Connection String
//const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

// //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

const main = async () => {
  let connection;
  try {
    connection = await MongoClient.connect(connectionString);
    const core = connection.db('insidercore');
    const sold = core.collection("soldinventories");
    const event = core.collection("events");
    const user = core.collection("users");
    const Transaction = core.collection("transactions");

    //fetching and mapping event details
    var eventData = await event.find({ _id: { $in: eventIds } }).toArray();
    const eventMap = {};
    _.map(eventData, (events) => {
      eventMap[ObjectId(events._id)] = events.name;
    })

    // Script is used to update the fetch the user details and event details
    // Input csv file name also verify the coulmn names transactionId
    var file_data = fs.readFileSync('input.csv', { encoding: 'utf8' });
    const csvData = csvjson.toObject(file_data, options);
    let responseCsvData = [];
    let count = 0;

    //Iterating over each row in the csv and fetching the data
    await Promise.map(csvData, async (csvRow) => {
      var transactionId = csvRow.transactionId;

      if (!transactionId) return true;

      var inventories = await sold.find({ transaction_id: ObjectId(transactionId), event_id: { $in: eventIds } }).toArray();

      if (inventories.length <= 0) return true;

      const transaction = await Transaction.findOne({ _id: ObjectId(transactionId) });

      var userId = await sold.distinct('user_id', { transaction_id: ObjectId(transactionId) });
      var userData = await user.find({ _id: ObjectId(userId[0]) }).toArray();

      // Adding the values and putting the data in file  

      var event_id = inventories[0].event_id;

      const cgst = !!transaction.gst && !!_.find(transaction.gst, { name: 'CGST' }) ? _.find(transaction.gst, { name: 'CGST' }).amount : 0;
      const sgst = !!transaction.gst && !!_.find(transaction.gst, { name: 'SGST' }) ? _.find(transaction.gst, { name: 'SGST' }).amount : 0;
        
        const pushData = {
          _id: transactionId,
        total_cost: transaction.amount,
          cgst: cgst,
          sgst: sgst,
        convenience_fee: transaction.convenienceFee,
          billing_email: userData[0].email,
          billing_name: userData[0].first_name + " " + userData[0].last_name,
          billing_tel: userData[0].phone_no,
          paytm_customer_id: userData[0].paytm_customer_id,
          event_id: event_id,
          event_name: eventMap[event_id]
        }
        responseCsvData.push(pushData);

      let rowsData = papaparse.unparse(responseCsvData);
      fs.writeFileSync(`./response_data.csv`, rowsData);
    });
  } catch (e) {
    console.log(e);
  } finally {
    if (connection) {
      connection.close();
    }
  }
}


main()
  .then(() => { console.log('---- Find the response file -----'); process.exit(1) });