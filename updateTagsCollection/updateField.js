/* 
This script will be used to add a field name state in tags collection.
*/

const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
const parseCSV = require("csv-parse/lib/sync");
const fs = require("fs");
const path = require("path");
const secondArgument = {
  replicaSet: "atlas-qp81ak-shard-0",
  ssl: true,
};

const CSV_FILE_PATH = path.resolve(".", "tag_field.csv");

const main = async () => {
  // //Staging - Connection String
  const connectionString =
    "mongodb://insider:insidergratisbleh@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";

  // PROD - Connection String
  // const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

  const connection = await MongoClient.connect(
    connectionString,
    secondArgument,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
  const core = connection.db("insidercore");
  const tags = core.collection("tags");
  const tagCsvData = parseCSV(fs.readFileSync(CSV_FILE_PATH, "utf8"), {
    columns: true,
  });
  console.log("Connected successfully to server");
  try {
    for (let tag of tagCsvData) {
      let tagId = tag.tag_id;
      let state = tag.state;
      let stateCode = tag.state_code;
      let stateShortName = tag.state_short_name;
      let templateId = tag.template;
      const result = await tags
        .find({
          _id: ObjectId(tagId.toString()),
        })
        .project({})
        .toArray();

      //console.log(result[0]);
      //console.log("template",ObjectId(templateId) )
      if (result[0]) {
        // If document exists, check if 'state' field exists
        if (!result[0].display_details || !result[0].display_details.hasOwnProperty("state")) {
          // Update document to add 'state' field
          await tags.findOneAndUpdate(
            { _id: ObjectId(tagId) },
            { $set: { "display_details.state": state, "display_details.state_short_name":stateShortName ,"display_details.state_code":stateCode, template : ObjectId(templateId) } }
          );
          console.log(`Updated tag_id ${tagId} with state ${state}`);
        } else {
          console.log(
            `Tag_id ${tagId} already has state field, skipping update`
          );
        }
      }
    }
  } catch (err) {
    console.error("Error updating documents:", err);
  } finally {
    // Close the connection
    await connection.close();
  }
};

main().then(() => {
  console.log("---- This is Done - Verify the same in DB -----");
  process.exit(1);
});
