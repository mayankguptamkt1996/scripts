# DynamoDB CSV Import Script

This script reads data from a CSV file (`input.csv`), processes each row, and adds the formatted data as items into an Amazon DynamoDB table. The script uses AWS IAM credentials (access key and secret) for authentication.

## Features
- Reads data from a CSV file.
- Formats each row to match the required DynamoDB schema.
- Uses AWS IAM access key and secret for authentication.
- Automatically capitalizes city names and converts states to uppercase before uploading them to DynamoDB.
- Adds data to a specified DynamoDB table.
- If `city` or `state` is not present, the script fetches the data from India Post API `https://api.postalpincode.in/pincode/${pincode}`

## Pre-requisites
To run this script, you need to have the following set up:
1. **Node.js** (version 20)
2. **AWS IAM User** with an access key and secret key ( Go to https://aws.zomans.com/, click on `Copy access key with role: [your user]`) and paste it in `frequentTechopsScripts/upsertServiceblePincode/env-var.sh`
3. **AWS SDK for Node.js** (`aws-sdk` package)
4. **DynamoDB Table** with the proper schema (ensure the table exists).
5. **CSV file**: You need a CSV file named `input.csv` located in the same directory as the script, containing the data you want to upload.

## CSV Format

The script expects a CSV file with at least the following headers:

| pincode | city    | state | nonServiceable |
|---------|---------|-------|----------------|
| 123456  | CityName | StateName | true |

Ensure that the `pincode` field is numeric, `city` is a string, and `` is a string.

NOTE: If `city` or `state` is not present, then it will be fetched via API

## Setup and Configuration

### Environment Variables
Set up the following environment variables to provide your AWS IAM credentials:

- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key
- `AWS_SESSION_TOKEN`: You AWS session token
- `ENV`: Either `stage` or `prod`, this decides what table name to use in the script

To get AWS cred, go to https://aws.zomans.com/, click on `Copy access key with role: [your user]`) and paste it in `frequentTechopsScripts/upsertServiceblePincode/env-var.sh`, it copies `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_SESSION_TOKEN`

### DynamoDB Table
The script uploads data to a DynamoDB table with the name `pincode-lookups-prod` or `pincode-lookups-stage`. Ensure that this table exists in the specified region (`ap-south-1` in the script) and has the necessary schema.

## Installation

1. Clone the repository or copy the script to your local machine.
2. Navigate to the directory containing the script.
3. Install the required Node.js dependencies:

    ```bash
    cd frequentTechopsScripts/upsertServiceblePincode && nvm use && npm i
    ```

## Running the Script

To run the script locally:

1. Set up the required AWS IAM credentials and ENV as environment variables:

    ```bash
    source env-var.sh
    ```

2. Execute the script using Node.js:

    ```bash
    node addItemToDynamo.js
    ```

The script will read the `input.csv` file, process each row, and add items to the DynamoDB table.

## Logging and Error Handling
- The script logs each item being processed from the CSV file for debugging purposes.
- If there’s an issue with adding an item to DynamoDB, an error message is displayed in the console.
- If the AWS credentials are not set, the script throws an error and stops execution.

## Additional Notes
- The script assumes that the `pincode-lookups-stage` or `pincode-lookups-prod` table exists in DynamoDB and that the provided IAM user has permission to write to this table.

## Dependencies

- [aws-sdk](https://www.npmjs.com/package/aws-sdk) - For interacting with AWS services.
- [csv-parser](https://www.npmjs.com/package/csv-parser) - For reading and parsing CSV files.
- [lodash](https://www.npmjs.com/package/lodash) - For data manipulation, such as capitalizing city names.
