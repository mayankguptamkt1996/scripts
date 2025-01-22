/*
This script is used to force generate the AWBs.
Doc link - https://wiki.mypaytm.com/display/INSIDER/Documentation+-+AWB+Generation
*/

const mongodb = require("mongodb");
const ObjectId = mongodb.ObjectID;
const dbClient = mongodb.MongoClient;
const Promise = require("bluebird");
const _ = require('lodash');
var AWS = require('aws-sdk');
AWS.config.update({
	accessKeyId: "AKIAJAJXFKSXFTJVJPOQ",
	secretAccessKey: "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",
	region: "ap-south-1",
	sslEnabled: true
});

const connectionString =
	"mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";
const shortcodes = [];
const result = [];
const main = async () => {

	const ogDb = await dbClient.connect(connectionString);
	var sns = new AWS.SNS({ region: 'ap-south-1' });
	//Promise.promisifyAll(sns);

	const db = ogDb.db("insidercore");
	const logisticsDb = ogDb.db("insiderlogistics");
	const Sold = db.collection("soldinventories");
	const Awbs = logisticsDb.collection("awbs");

	var publishSnsMessage = function publishSnsMessage(txnId) {
		return sns.publish({
			TopicArn: "arn:aws:sns:ap-south-1:155772818492:CreateAwbProd",
			Message: JSON.stringify({ transactionId: txnId }, null, 4)
		}).promise();
	};

	console.log("Event Name = Enter Event Name Here")

	const txns = await Sold.distinct("transaction_id", {
		transaction_id: {
			$in: [
				//ObjectId('64b64f62018537000c610817')
			]
		},
		status: { $nin: ["insured_cancelled", "refunded", "transferred", "cancelled"] },
		delivery_type: { $in: ["delivery_or_pickup", "delivery_only"] },
		delivery_details: { $exists: true },
	});

	console.log("Total Transaction in event =", _.size(txns));
	let newAwbGeneratedCount = 0;

	console.log("\n<-------- All the Transaction Ids for which AWB will be generated -------->\n");
	await Promise.map(txns, async (txn) => {
		const awbDoc = await Awbs.findOne({ transaction_id: txn }, { transaction_id: 1, awb: 1, _id: 0 });
		if (!awbDoc) {
			newAwbGeneratedCount++;
			console.log(txn);
			await publishSnsMessage(txn.toString());
		}
	});
	console.log("\n<---------------->\n");
	console.log("Total AWBs generated via script =", newAwbGeneratedCount);
	return 'Script completed!';
};
main()
	.then(result => {
		console.log(result);
		process.exit(1);
	})
	.catch(e => console.error(e) || process.exit(0));