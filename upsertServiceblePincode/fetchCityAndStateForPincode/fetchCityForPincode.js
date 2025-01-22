const fs = require("fs");
const csvjson = require("csvjson");
const { pincodes } = require('./pincodes');
const { getCityAndStateForPincode } = require('./util');

// Disable SSL certificate validation (use with caution)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function getCityMapForPincodes(pincodes) {
  const cityData = [];

  for (const pincode of pincodes) {
    const data = await getCityAndStateForPincode(pincode);
    if (data && data.city && data.state && data.pincode) {
      cityData.push(data);
    }
  }

  return cityData;
}

getCityMapForPincodes(pincodes)
  .then(pincodeData => {
    console.log(pincodeData);
    const writeCsvOptions = { headers: "keys" };
    const pincodeWithCityAndState = csvjson.toCSV(
      pincodeData,
      writeCsvOptions
    );
    fs.writeFileSync(`./pincodeWithCityAndStateData-${Math.round(new Date().getTime() / 1000)}.csv`, pincodeWithCityAndState);
  })
  .catch(error => console.error('Error:', error));

module.exports = {
  getCityAndStateForPincode
}