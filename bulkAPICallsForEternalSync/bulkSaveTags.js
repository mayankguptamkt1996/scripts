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

var stageUriTag = 'https://internal-staging.insider.in/tag';
var prodUriTag = 'http://new-internal.insider.in/tag';

var apiKey = "eb5cf01e097921b91c88b32b57db41c0abb45af043621226460e107d60cfdeb8";
var userId = "651d0d200e2407f5249d85fc";
var tagUri = prodUriTag;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function makeRequestWithRetry(tagReq, retries = MAX_RETRIES) {
    try {
        const response = await request(tagReq);
        return response;
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying... (${MAX_RETRIES - retries + 1})`);
            await Promise.delay(RETRY_DELAY_MS);
            return makeRequestWithRetry(tagReq, retries - 1);
        } else {
            throw error;
        }
    }
}

const main = async () => {
    var file_data = fs.readFileSync('tags.csv', { encoding: 'utf8' });
    const csvData = csvjson.toObject(file_data, options);

    try {
        await Promise.map(csvData, async (csvRow) => {
            var tagId = csvRow._id;
            var __v = csvRow.__v;

            const header = { 'Content-Type': 'application/json', 'API-KEY': apiKey, 'X-User-Id': userId, 'X-Filter-By': JSON.stringify({ edit: '*', assign: '*' }) };
            console.log(tagId, __v);
            var tagReq = {
                method: 'POST',
                headers: header,
                uri: tagUri,
                body: {
                    _id: new mongoose.Types.ObjectId(tagId),
                    __v: __v
                },
                json: true
            };

            try {
                const tagResponse = await makeRequestWithRetry(tagReq);
                if (tagResponse.result !== 'ok') {
                    console.log('Error in saving tag:', tagId);
                } else {
                    console.log('Tag saved:', tagId);
                }
            } catch (e) {
                console.log('Error in saving tag after retries:', tagId, e.statusCode, e.error);
            }
        }, {
            concurrency: 1
        });
    } catch (e) {
        console.log('Error in saving tags:', e);
    }
}

main()
    .then(() => {
        console.log('---- This is Done - Verify the same in DB -----');
        process.exit(1);
    });
