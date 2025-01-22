const mongodb = require("mongodb");
const fs = require('fs');
var csvjson = require('csvjson');
const Promise = require('bluebird');
const request = require('request-promise');
var mongoose = require('mongoose');
var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};

var stageUriEvent = 'https://internal-staging.insider.in/event/register';
var prodUriEvent = 'http://new-internal.insider.in/event/register';

var apiKey = "eb5cf01e097921b91c88b32b57db41c0abb45af043621226460e107d60cfdeb8";
var userId = "651d0d200e2407f5249d85fc";
var eventUri = stageUriEvent;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function makeRequestWithRetry(eventReq, retries = MAX_RETRIES) {
    try {
        const response = await request(eventReq);
        return response;
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying... (${MAX_RETRIES - retries + 1})`);
            await Promise.delay(RETRY_DELAY_MS);
            return makeRequestWithRetry(eventReq, retries - 1);
        } else {
            throw error;
        }
    }
}

const main = async () => {
    var file_data = fs.readFileSync('events.csv', { encoding: 'utf8' });
    const csvData = csvjson.toObject(file_data, options);

    try {
        await Promise.map(csvData, async (csvRow) => {
            var eventId = csvRow.event_id;
            var __v = csvRow.__v;

            const header = {
                'Content-Type': 'application/json',
                'API-KEY': apiKey,
                'X-User-Id': userId,
                'X-Filter-By': JSON.stringify({ edit: '*', assign: '*' })
            };
            console.log(`Processing event ID: ${eventId}, Version: ${__v}`);

            var eventReq = {
                method: 'POST',
                headers: header,
                uri: eventUri,
                body: {
                    _id: new mongoose.Types.ObjectId(eventId),
                    __v: __v
                },
                json: true
            };

            try {
                const eventResponse = await makeRequestWithRetry(eventReq);
                console.log(`Event saved successfully: ${eventId}`);
            } catch (e) {
                console.log(`Error in saving event after retries: Event ID ${eventId}`, e.statusCode, e.error);
            }
        }, {
            concurrency: 1
        });
    } catch (e) {
        console.log('Error in processing events:', e);
    }
}

main()
    .then(() => {
        console.log('---- This is Done - Verify the same in DB -----');
        process.exit(1);
    });
