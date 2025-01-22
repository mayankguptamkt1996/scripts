/**
This script clone the permissions of one user to n number of users.

Step 1 : Fetch the user Id from the emails mentioned in the input.csv
Step 2 : Fetch the permissions doc of the user id defined CLONE_FROM_USER_ID here
Step 3 : Call the API - permission/upsert for every permission
 */

const _ = require("lodash");
const Promise = require("bluebird");
const papaparse = require("papaparse");
const fs = require("fs-extra");
const { MongoClient, ObjectId } = require("mongodb");

/**
 * Parses the given file name asynchronously and returns a promise.
 */
const asyncParse = (fileName) =>
  new Promise((resolve) =>
    papaparse.parse(fs.readFileSync(fileName, "utf8"), {
      dynamicTyping: true,
      header: true,
      skipEmptyLines: true,
      complete: resolve,
    })
  );

const CLONE_FROM_USER_ID = "67696482dccb6e32ae09f6f9"; // user id from which permissions to be copied
const X_USER_ID = "651d0929cac89500099129aa"; // user id of person who is runing the script
const API_KEY = "e0e97d7008e4c02047a337ac09301597e4e47a08cc344cffd2cb85a5d0109852"; // API key of user id who is running the script
const AuthorizationToken = "Basic Mjg3NGQyNzUtMWU1Yi00NmI2LTgwYmYtM2Y2NzlmYzE1M2QzOg=="; // Auth token
const STAGE_URL = "https://internal-staging.insider.in/permission/upsert"; // staging url
const PROD_URL = "http://internal.insider.in/permission/upsert"; // prod url

/**
 * Fetches the user ID from the database for the given email address.
 *
 * @param {Object} Users - The MongoDB users collection object.
 * @param {string} emailId - The email address to look up.
 * @returns {string} The user ID string for the given email.
 */
const fetchUserId = async (Users, emailId) => {
  const result = await Users.find(
    {
      email: emailId,
    },
    { projection: { _id: 1 } }
  ).toArray();
  return result[0]?._id.toString();
};


/**
 * Fetches the permissions documents for the given user ID from MongoDB.
 *
 * @param {Object} Permissions - The MongoDB permissions collection object.
 * @returns {Object[]} An array of permission documents for the user.
 */
const fetchUserPermission = async (Permissions) => {
  const result = await Permissions.find({
    user: ObjectId(CLONE_FROM_USER_ID),
  }).toArray();
  return result;
};

(async () => {
  // //Staging - Connection String
  //const connectionString = "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@stage-rs0-shard-00-00.runtd.mongodb.net:27017,stage-rs0-shard-00-01.runtd.mongodb.net:27017,stage-rs0-shard-00-02.runtd.mongodb.net:27017/insidercore?ssl=true&authSource=admin";
  
  // // PROD - Connection String
  const connectionString =
   "mongodb://" +
   process.env.MONGODB_USERNAME +
   ":" +
   process.env.MONGODB_PASSWORD +
   "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";
  let connection;
  let output = [];
  try {
    connection = await MongoClient.connect(connectionString,{ useNewUrlParser: true, useUnifiedTopology: true });
    const coreDB = connection.db("insidercore");
    const Permissions = coreDB.collection("permissions");
    const Users = coreDB.collection("users");
    const { data: emails } = await asyncParse("input.csv");
    const permissions = await fetchUserPermission(Permissions);
    for (const { emailId } of emails) {
      const userId = await fetchUserId(Users, emailId);
      console.log("email Id, total permission's found", emailId, permissions.length);
      if (userId && permissions.length > 0) {
        const payloads = permissions.map((permission) => ({
          user: userId,
          action: permission.action,
          resourcesAllowed: permission.resourcesAllowed,
          resourcesDisallowed: permission.resourcesDisallowed,
        }));
        payloads.map(async (payload) => {
          const result = await fetch(PROD_URL, {
            method: "POST",
            headers: {
              "API-KEY": API_KEY,
              "Content-Type": "application/json",
              "X-User-Id": X_USER_ID,
              "X-Filter-By": '"*"',
              Authorization: AuthorizationToken,
            },
            body: JSON.stringify(payload),
          });
          const data = await result.json();
          output.push({
            emailId: emailId,
            action: payload?.action,
            result: data?.result,
          });
          let rowsData = papaparse.unparse(output);
          fs.writeFileSync(`./output.csv`, rowsData);
        });
      } else {
        if (!permissions.length) console.log("No permissions found for this user id", CLONE_FROM_USER_ID);
        else console.log("No userId found for this email id", emailId);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    if (connection) {
      console.log("closing connection");
      connection.close();
    }
  }
})();
