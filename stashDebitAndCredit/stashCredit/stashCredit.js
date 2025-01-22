/* 
This script is used to credit the stash in user's account based on user's email id.
Doc - https://wiki.mypaytm.com/display/INSIDER/Documentation+-+Credit+stash
*/

const mongodb = require("mongodb");
const _ = require("lodash");
const Promise = require("bluebird");

const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const request = require('request-promise');

let unregisteredIds = [];

const issueWallet = async (email, user_id, amount) => {
    var options = {
        method: 'POST',
        headers: {
            "api-key": "", // put your api-key here
            "Cache-Control": "no-cache",
            "Content-Type": "application/json; charset=utf-8",
        },
        uri: 'http://internal.insider.in/offer/creditWallet',   //prod api
        //uri: 'https://internal-staging.insider.in/offer/creditWallet',   //staging api
        body: {
            "user_id": user_id,
            "issue_reason": "Requested by Customer Support",
            "issued_for": "NA",
            "amount": amount
        },
        json: true // Automatically stringifies the body to JSON
    };

    const response = await request(options);
    console.log(email);
};

/**
 * @type {Array<{ email: string; amount: number; }>}
 */
const emails = [
    {
        email : '<User_email_id>', //add User's email id
        amount : 1, //add the amount here 
    }
];

const mongoUrl =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin";

const main = async () => {
    let connection;
    try {
        const mongoUsername = process.env.MONGODB_USERNAME;
        const mongoPassword = process.env.MONGODB_PASSWORD;
        const connectionString = mongoUrl;  

        connection = await MongoClient.connect(connectionString);
        const db = connection.db('insidercore');

        await Promise.map(emails, async ({ email, amount }) => {
            const user = await db.collection('users').findOne({
                'email': email
            }, {
                '_id': 1,
            });
            if (!user) {
                unregisteredIds.push(email);
            } else {
                return await issueWallet(email, user['_id'], amount)
            }
        }, {
                concurrency: 1
            });

        console.log('Unregistered Ids');
        for (const id of unregisteredIds) {
            console.log(id);
        }

    } catch (e) {
        console.error(e);
    } finally {
        console.log('closing connection');
        connection.close();
    }
};

main();
