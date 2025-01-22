const AWS = require('aws-sdk');
const fs = require('fs');
const csv = require('csv-parser');
const _ = require('lodash');
const { getCityAndStateForPincode } = require('./fetchCityAndStateForPincode/util');

const ENV = process.env.ENV;
// Disable SSL certificate validation (use with caution)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Set up AWS credentials using IAM access key and secret
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;  // AWS Access Key ID
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;  // AWS Secret Access Key
const region = 'ap-south-1';  // Your AWS region
const tableName = `pincode-lookups-${ENV}`;  // DynamoDB table name

// Check for missing credentials
if (!accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS credentials: Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
}

// Reject if invalid ENV is given
if (!ENV || !['prod', 'stage'].includes(ENV)) {
    throw new Error("Missing or invalid ENV.", ENV);
}

// Load AWS credentials directly
AWS.config.update({
    region
});

// Create DynamoDB Document Client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Function to add items to DynamoDB
const addItem = async (item) => {
    console.log("Saving:", item.pincode);
    const params = {
        TableName: tableName,
        Item: item
    };

    try {
        const result = await dynamoDB.put(params).promise();
        console.log('Saved successfully:', item.pincode);
    } catch (error) {
        console.error('Error in saving:', item.pincode, error.message);
    }
};

const items = [];

async function processCSV() {
    const stream = fs.createReadStream('input.csv').pipe(csv());
  
    stream.on('data', async (row) => {
      stream.pause(); // Pause the stream while processing
  
      let city = row.city;
      let state = row.state;
  
      if (!city || !state) {
        try {
          const fetchedPincodeData = await getCityAndStateForPincode(row.pincode);
          if (!city) city = fetchedPincodeData.city;
          if (!state) state = fetchedPincodeData.state;
        } catch (error) {
          console.error('Error in getCityAndStateForPincode:', error);
        }
      }
  
      const item = {
        pincode: Number(row.pincode), // Ensure pincode is a number
        city: _.capitalize(String(city)), // Capitalize the city
        STATE: String(state).toUpperCase(), // Convert state to uppercase
        nonServiceable: row.nonServiceable === 'true', // Convert to boolean
      };
  
      if (item.pincode && item.city && item.STATE) {
        console.log(
          'Data for input for pincode:',
          item.pincode,
          item.city,
          item.STATE,
          item.nonServiceable
        );
        items.push(item);
      } else {
        console.error('Invalid data:', row, city, state);
      }
  
      stream.resume(); // Resume the stream for the next row
    });
  
    stream.on('end', async () => {
      console.log('CSV file successfully processed.', items);
  
      // Batch add items to DynamoDB
      for (const item of items) {
        try {
          await addItem(item);
        } catch (error) {
          console.error('Error adding item to DynamoDB:', error);
        }
      }
    });
  
    stream.on('error', (error) => {
      console.error('Error reading CSV file:', error.message);
    });
  }
  
  processCSV();
