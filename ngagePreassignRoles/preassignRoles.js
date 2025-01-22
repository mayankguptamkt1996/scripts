/*
This is the script to assign a role to an email for the live_events.
Doc - https://wiki.mypaytm.com/pages/viewpage.action?pageId=332885441
*/

const _ = require('lodash')
const mongodb = require("mongodb");
const dbClient = mongodb.MongoClient;
const { Client } = require('pg');
const csvparse = require('csv-parse/lib/sync');
const Bluebird = require('bluebird');
const fetch = require('node-fetch');
const fs = require('fs');
const connectionString =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

const NGAGE_ROLES = {
    ADMIN: "admin",
    MODERATOR: "moderator",
    PARTICIPANT: "participant",
    AUDIENCE: "audience"
}

const LIVE_EVENT_ID = '';   //put live_event_id
const CORE_EVENT_ID = '';   //put core_event_id
const STAGE_ID = '';    //put stage_id
const ROLE = NGAGE_ROLES.PARTICIPANT;

const upsertPermission = (user_id, role) => {
    var myHeaders = new fetch.Headers();
    myHeaders.append("x-user-id", "");  //put your user_id
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
        "user_id": user_id,
        "stage_id": STAGE_ID,
        "core_event_id": CORE_EVENT_ID,
        "role": role,
        "live_event_id": LIVE_EVENT_ID,
        "force": true
    });

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    return fetch("http://api.tv.internal.insider.in/tv/api/v1/events/permission/upsert", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
}

const main = async () => {
    const pgClient = new Client({
        user: "ngage_staging2",
        host: "ngage.db.insider.in",
        database: "ngage2",
        password: "" + process.env.MONGODB_PASSWORD + "",
        port: 5432,
    });

    try {
        const ogDb = await dbClient.connect(connectionString);
        const db = ogDb.db("insidercore");
        const Users = db.collection("users");

        /**
         * Parse the csv here which has 2 columns Name, Email
         */
        const participants = csvparse(fs.readFileSync('participants.csv'), {
            columns: true
        });

        /**
         * Find all the users via their email address in the insidercore database
         */
        const users = await Users.find({
            email: {
                $in: participants.map(p => p.Email)
            }
        }).toArray();

        /**
         * Group all the users and create a hashmap for the next step
         * */
        const groupedUsers = _.groupBy(users, 'email');

        /**
         * List down all the users without an account. To find this, we'll go through the parsed csv array (`participants`)
         * and filter out users without an entry in `groupedUsers`
         */
        console.log("Users without an account - ", participants.filter(p => !(p.Email in groupedUsers)).map(p => p.Email));

        /**
         * We'll map over all the user documents and start upserting their permissions in the ngage db
         */
        await Bluebird.map(users, (user) => {
            // This API doesn't support assignment with the role = admin, so for that we'll replace this with moderator and in a separate step (see below) we will update the role via a db query
            return upsertPermission(user._id, ROLE === NGAGE_ROLES.ADMIN ? "moderator" : ROLE);
        }, { concurrency: 3 });

        /**
         * If the role is admin, then we'll update the users' permission entries in the ngage db
         * and change their role from moderator -> admin
         */
        if (ROLE === NGAGE_ROLES.ADMIN) {
            await pgClient.connect();

            const updateQuery = users.map((user) => {
                return `update permissions set role='${NGAGE_ROLES.ADMIN}' where user_id='${user._id}' and live_event_id='${LIVE_EVENT_ID}' and stage_id='${STAGE_ID}';`
            });

            console.log(updateQuery);

            const { rowCount } = await pgClient.query(updateQuery.join(''));

            console.log('update query count: ', updateQuery.length);
            console.log('update row count: ', rowCount);
        }

        console.log("done");
    } catch (error) {
        console.log(error);
    } finally {
        pgClient.end();
    }
}

main()
    .then(result => {
        console.log(result);
        process.exit(1);
    })
    .catch(e => console.error(e) || process.exit(0));