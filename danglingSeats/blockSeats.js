process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const Promise = require("bluebird");
const fetch = require("node-fetch");
const redis = require("redis");
const _ = require("lodash");
Promise.promisifyAll(redis.RedisClient.prototype);
const mongodb = require("mongodb");
const prompt = require("prompt-sync")();
const dbClient = mongodb.MongoClient;
const ObjectId = require("mongodb").ObjectId;
const connectionString = {
	prod:
		"mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin&readPreference=secondaryPreferred",
	stage:
		"mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@db1.stage.insider.in:27017?authSource=admin",
};
const SEATS_IO_API_REGION = "eu";
const AUTH_TOKEN = {
	prod: "Basic Mjg3NGQyNzUtMWU1Yi00NmI2LTgwYmYtM2Y2NzlmYzE1M2QzOg==",
	stage: "Basic NWQwOTJiNDktODlhYS00NjFjLWJhYWMtNzYxNDQ5ZGI0ZGZlOg==",
};
var ENV;

const callSeatsIo = ({ url, method = "POST", body }) => {
	const myHeaders = {};
	const requestOptions = {
		method,
	};

	myHeaders["Authorization"] = AUTH_TOKEN[ENV];

	if (method === "POST" && body) {
		requestOptions.body = JSON.stringify(body);
		myHeaders["Content-Type"] = "application/json";
	}

	requestOptions.headers = myHeaders;

	return fetch(url, requestOptions);
};

// const releaseCall = (seatsIoEventId, seat) =>
// 	callSeatsIo({
// 		url: `https://api-${SEATS_IO_API_REGION}.seatsio.net/events/${seatsIoEventId}/actions/release`,
// 		body: { objects: [seat], orderId: `Dangling script (release)` },
// 	});

const blockCall = (seatsIoEventId, seat, orderId) =>
	callSeatsIo({
		url: `https://api-${SEATS_IO_API_REGION}.seatsio.net/events/${seatsIoEventId}/actions/book`,
		body: { objects: [seat], orderId: `${orderId} | Dangling script (book)` },
	});

const main = async () => {
	ENV = prompt("Please enter the ENV (eg: stage, prod): ");
	const eventId = prompt(
		"Please enter the event id (eg: 5dac6506a828000008c6c959): "
	);
	const allow = prompt(
		"If you have updated the script without approval from the devs. Please abort by pressing 'q' (press 'y' to proceed): "
	)

	if (!allow || allow.toLowerCase() !== 'y') {
		console.log('Good call mate! Better late than never!');
		return "Go check with devs!";
	}

	if (
		!ENV ||
		!eventId ||
		!Object.keys(connectionString).includes(ENV) ||
		!/^[0-9a-fA-F]{24}$/.test(eventId)
	) {
		throw new Error(
			"`ENV` and `eventId` are required and should be valid! Please check the input provided."
		);
	}

	const redisClient = await redis.createClient(
		"6379",
		"redis-core-live-reader.internal.insider.in"
	);
	//redis-core-live.internal.insider.in (old redis uri)

	await redisClient.selectAsync(6);
	const ogDb = await dbClient.connect(connectionString[ENV]);
	const db = ogDb.db("insidercore");
	const Items = db.collection("items");
	const Event = db.collection("events");
	const Sold = db.collection("soldinventories");

	const getSeatsFromMongo = async (itemArr) => {
		const seats = await Sold.find(
			{
				item_id: { $in: itemArr },
				status: { $nin: ["refunded", "insured_cancelled", "cancelled"] },
			},
			{ name: 1 }
		).toArray();
		return seats.map((seat) => seat.name);
	};

	const getSeatsFromSeatsIo = async (seats_io_id) => {
		const response = await callSeatsIo({
			method: "GET",
			url: `https://api-${SEATS_IO_API_REGION}.seatsio.net/reports/events/${seats_io_id}/byStatus/booked`,
		});
		const seatsByStatus = await response.json();

		if (response.status !== 200) {
			console.log(
				"ERROR in getSeatsFromSeatsIo: ",
				JSON.stringify(seatsByStatus)
			);
			throw new Error(seatsByStatus.messages.join(", "));
		}

		return _.chain(seatsByStatus).get("booked").map("label").value();
	};

	const getSeatsFromRedis = async (key) => {
		const redisSeats = await redisClient.scanAsync(
			0,
			"MATCH",
			`*.${key}.*`,
			"COUNT",
			1000000
		);
		return redisSeats[1].map((redisKey) => {
			const reString = `(.*${key}).`;
			const re = new RegExp(reString, "g");
			const string = redisKey.split(re);
			return string[2].replace(".seats", "");
		});
	};

	const event = await Event.findOne({ _id: ObjectId(eventId) });
	if (_.isEmpty(event)) {
		throw new Error(`Event (${eventId}) not found!`)
	}
	const shows = _.get(event, "venues.0.shows", []);

	await Promise.map(shows, async (show) => {
		try {
			const itemgroups = show.items_for_sale;
			await Promise.map(itemgroups, async (itemGroup) => {
				const key = itemGroup.seats_io_id;
				if (!_.isEmpty(key)) {
					const items = await Items.find(
						// NOTE: Incase you want to run this granularly (DONT USE A SINGLE ITEM)
						// PLEASE use ALL THE ITEMS FOR THE ITEM GROUP that have the same setas_io_id
						// And update the seats_io_id and the items ids in the below query
						{ seats_io_id: key },
						{ _id: 1 }
					).toArray();
					const itemArr = items.map((x) => x._id);

					const seatsInMongo = await getSeatsFromMongo(itemArr);
					const seatsInSeatIo = await getSeatsFromSeatsIo(key);
					const seatsInRedis = await getSeatsFromRedis(key);
					const blockedInDb = seatsInMongo.concat(seatsInRedis);
					const toBeReleased = _.difference(seatsInSeatIo, blockedInDb);
					const toBeBlocked = _.difference(blockedInDb, seatsInSeatIo);

					console.log("Checking Blocking...");
					await Promise.map(
						toBeBlocked,
						async (seat) => {
							const inv = await Sold.findOne({
								name: seat,
								item_id: { $in: itemArr },
								status: { $nin: ["insured_cancelled", "refunded", "cancelled"] },
							});

							if (!_.isEmpty(inv)) {
								const res = await blockCall(key, seat, inv.cart_id);
								if (res.status !== 204) {
									console.log(`Error in blocking ${seat} for ${key}`);
									return;
								}
								console.log(`Blocked ${seat} for ${key}`);
							} else {
								console.log("Inventory doesn't exist");
								return Promise.resolve();
							}
						},
						{ concurrency: 1 }
					);

					// console.log("Checking Releasing...");
					// await Promise.map(
					// 	toBeReleased,
					// 	async (seat) => {
					// 		const inv = await Sold.findOne({
					// 			name: seat,
					// 			item_id: { $in: itemArr },
					// 			status: { $nin: ["insured_cancelled", "refunded", "cancelled"] },
					// 		});

					// 		if (_.isEmpty(inv)) {
					// 			const res = await releaseCall(key, seat);
					// 			if (res.status !== 204) {
					// 				console.log(`Error in releasing ${seat} for ${key}`);
					// 				return;
					// 			}
					// 			console.log(`Released ${seat} for ${key}`);
					// 		} else {
					// 			console.log("Inventory exists");
					// 			return Promise.resolve();
					// 		}
					// 	},
					// 	{ concurrency: 1 }
					// );
				}
			}, { concurrency: 1 });
		} catch (e) {
			console.log(e);
		}
	});
	return "DONE!";
};

main()
	.then((result) => {
		console.log(result);
		process.exit(0);
	})
	.catch((e) => console.error(e) || process.exit(1));
