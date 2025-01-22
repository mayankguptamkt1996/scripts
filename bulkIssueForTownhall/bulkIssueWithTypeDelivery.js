/*
This code snippet issues tickets that uses async/await to make an HTTP POST request to a endpoint - http://internal.insider.in/transaction/completeWithoutPayment 
with JSON data. It then processes the response and logs the result.It logs total number of tickets issued successfully.
 */

const _ = require("lodash");
const Promise = require("bluebird");
const csvjson = require("csvjson");
const fs = require("fs");

const API_URL = "http://internal.insider.in/transaction/completeWithoutPayment";
const API_KEY = "e0e97d7008e4c02047a337ac09301597e4e47a08cc344cffd2cb85a5d0109852";
const X_USER_ID = "651d0929cac89500099129aa";
const ITEM_ID = "6745ccf10f1f55519ec1b50b"; // ITEM ID for bulk issue

var options = {
  delimiter: ",", // optional
  quote: '"', // optional
};

var file_data = fs.readFileSync("input_delivery.csv", { encoding: "utf8" });
var result = csvjson.toObject(file_data, options);
let count = 0;

/**
 * Function to perform a specific action using the provided JSON data.
 *
 * @param {Object} json - the JSON data object
 * @return {Promise} a Promise that resolves to the result of the action
 */
var resultMapValue = async function (json) {
  const cnt = json.count;
  const z_shortcode = json.z_shortcode;
  const z_order_id = json.z_order_id;
  console.log(json);
  const type = "issued";
  const external_event_id = "TESTINGID"; // needs to be changed while changing the event id
  const name = json.deliveryName;
  const email = json.deliveryEmail;
  const phone = json.deliveryPhone;
  const delivery_type = "delivery_only";
  // const inv_params = [{
  //   params: [
  //     {
  //       name: json.inv_user_params_name,
  //       value: json.inv_user_params_value
  //     }
  //   ]
  // },
  // {
  //   params: [
  //     {
  //       name: json.inv_user_params_name1 ? json.inv_user_params_name1 : "NA",
  //       value: json.inv_user_params_value1 ? json.inv_user_params_value1 : "NA"
  //     }
  //   ]
  // },
  // ];
  // const item_params = [{
  //   name: json.item_user_params_name,
  //   value: json.item_user_params_value
  // }];
  const delivery_details = {
    name: json.name,
    address_1: json.address_1,
    address_2: json.address_2,
    city: json.city,
    state: json.state,
    landmark: json.delivery_details_landmark,
    pincode: json.pincode,
    address_type: "residential",
  };
  const cartDoc = [
    {
      _id: ITEM_ID,
      count: cnt, // number of tickets to be issued
      delivery_details: delivery_details,
      delivery_type: delivery_type,
      // item_user_params: item_params,
      // inventory_user_params: inv_params
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
        z_order_id,
        z_shortcode,
        external_event_id,
        cart: {
          items: cartDoc,
          delivery_details,
          delivery_type,
        },
        opts: {
          skipCommunication: true,
        },
      }),
    });
    const json = await apiResult.json();
    console.log("New",json);
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
