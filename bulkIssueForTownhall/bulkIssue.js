/*
This code snippet issues tickets that uses async/await to make an HTTP POST request to a endpoint - http://internal.insider.in/transaction/completeWithoutPayment 
with JSON data. It then processes the response and logs the result.It logs total number of tickets issued successfully.
 */

const _ = require("lodash");
const Promise = require("bluebird");
const csvjson = require("csvjson");
const fs = require("fs");

const API_URL = "http://internal.insider.in/transaction/completeWithoutPayment";
const API_KEY =
  "6hf81654b1aca6qqufye87dc2a3f52a744327384119e4657b1c1fc900f24b8364";
const X_USER_ID = "57ad87b1a7c8cdd2e0f2caf6";
const ITEM_ID = "6586b3eef5227500088fd433";

var options = {
  delimiter: ",", // optional
  quote: '"', // optional
};

var file_data = fs.readFileSync("input.csv", { encoding: "utf8" });
var result = csvjson.toObject(file_data, options);
let count = 0;

/**
 * Function to perform a specific action using the provided JSON data.
 *
 * @param {Object} json - the JSON data object
 * @return {Promise} a Promise that resolves to the result of the action
 */
var resultMapValue = async function (json) {
  const type = "complimentary";
  const name = json.deliveryName;
  const email = json.deliveryEmail;
  const phone = json.deliveryPhone;
  const cartDoc = [
    {
      _id: ITEM_ID,
      count: 1, // number of tickets to be issued
      item_user_params: [],
    },
  ];

  try {
    const apiResult = await fetch(API_URL, {
      method: "POST",
      headers: {
        "API-KEY": API_KEY,
        "Content-Type": "application/json",
        "X-User-Id": X_USER_ID,
      },

      body: JSON.stringify({
        email,
        phone,
        name,
        transaction_type: type,
        cart: {
          items: cartDoc,
        },
        opts: {
          skipCommunication: true,
        },
      }),
    });
    const json = await apiResult.json();
    console.log(json);
    if (json?.status !== 200) {
      console.log("error occured");
    } else {
      console.log("succes, check in db once");
      count = count + 1;
    }
  } catch (e) {
    console.log(e);
    return;
  }
};

const main = async () => {
  await Promise.map(result, resultMapValue, { concurrency: 1 });
  console.log(`total tickets issued successfully`, count);
};

main()
  .then((result) => {
    process.exit(1);
  })
  .catch((e) => console.error(e) || process.exit(0));
