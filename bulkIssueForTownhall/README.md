# Bulk Issue tickets

This code snippet is an asynchronous function that connects to a MongoDB database, reads data from an input CSV file,processes the data by fetching transaction IDs and
item IDs from the database,and then writes the processed data into a new CSV file.

# Note:

We don't run the script unless it's an exception. Please check this thread - https://insiderdotin.slack.com/archives/CDGNWTNTD/p1706536351171079

## Steps:

1. CS-tech team will give the csv (deliveryName,deliveryEmail,deliveryPhone) which can be found in input.csv file.

2. We will also need the item id for which we are issuing tickets. This will be provided by cs-tech team.

3. Run npm i for downloading node-modules packages.

4. Uncomment the line 68(await operation) and run the script by this command `node bulkIssue.js`
