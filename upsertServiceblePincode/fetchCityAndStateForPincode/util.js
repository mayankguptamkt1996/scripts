const request = require('request-promise');

async function getCityAndStateForPincode(pincode) {
    try {
        var options = {
            method: 'GET',
            uri: `https://api.postalpincode.in/pincode/${pincode}`
        }
      const response = await request(options);
      const data = JSON.parse(response);
      
      if (data[0].Status === 'Success') {
        return {pincode: pincode, city: data[0].PostOffice[0].District, state: data[0].PostOffice[0].State}
      } else {
        throw new Error('Could not find data for the given pincode', pincode);
      }
    } catch (error) {
      console.log('Error in getCityAndStateForPincode:', error);
      throw new Error('getCityAndStateForPincode: Could not find data for the given pincode', pincode);
    }
  }

module.exports = {
    getCityAndStateForPincode
};