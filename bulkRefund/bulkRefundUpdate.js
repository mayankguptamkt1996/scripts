/* 
This script is used to bulk refund.
Doc - https://wiki.mypaytm.com/pages/viewpage.action?pageId=307262574
*/

const fetch = require("node-fetch");
const ObjectId= require("mongodb").ObjectId
const Promise = require('bluebird')
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;

const connectionString =
	"mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

const SYS_NONE_EMAIL_USER_KEY = ""; //Add your api_key before running the script
const X_USER_ID = "";  //Add your user_id 
const eventId = ""; //Add the event_id here

const main = async () => {
	const ogDb = await dbClient.connect(connectionString);
	const db = ogDb.db("insidercore");
	const Sold = db.collection("soldinventories");

	const txns = (await Sold.distinct('transaction_id', {
		//user_id : ObjectId("5e4e2593135ca70008fa81f2"), item_id : ObjectId("5e4e2546a79a050008cef4a8"),
		//timestamp_added : { $gte : new Date('2020-12-28T10:00:00.000Z'), $lte :  new Date('2020-12-28T16:00:00.000Z') },
		event_id : ObjectId(eventId),
		status: { $nin: ["refunded", "cancelled"] }
	}, {
		readPreference: 'secondaryPreferred'
	}));

	let count = 0;

	await Promise.map(txns, async (txn) => {
		try {
			await fetch(
				"http://internal.insider.in/transaction/change",
				{
					method: "POST",
					headers: {
						'API-KEY': SYS_NONE_EMAIL_USER_KEY,
						'Content-Type': 'application/json',
						'X-User-Id': X_USER_ID
					},

					body: JSON.stringify({
						status: 'refund',
						transaction_id: txn
					})
				}
			);

			count++;
			console.clear();
			console.log(count);
		}
		catch (e) {
			console.error(e);
			console.log("failed for :", txn);
			return
		}

	}, {concurrency: 6});
	return "Done";
};

main()
	.then(result => {
		console.log(result);
		process.exit(1);
	})
	.catch(e => console.error(e) || process.exit(0));