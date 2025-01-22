/** This Script helps you to download documents of the brands
 * Please refer to this doc - https://wiki.mypaytm.com/display/INSIDER/Documentation+-+Brand+Documents+download+from+S3
 */

const aws = require('aws-sdk');
const mongo = require('mongodb');
const papa = require('papaparse');
const fs = require('fs-extra');
const path = require('path');
const bluebird = require('bluebird');
const _ = require('lodash');

const BUCKET_NAME = 'brand-documents';

const asyncParse = (path) => new Promise((resolve, reject) => papa.parse(fs.createReadStream(path), { header: true, skipEmptyLines: true, complete: e => resolve(e.data), error: reject }));

aws.config.update({
    accessKeyId: "AKIAI5OPC5GIXYA6NQZQ",
    secretAccessKey: "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",
    "region": "ap-south-1"
});

const chunkedIteration = async (invs, cb) => {
    await bluebird.mapSeries(_.chunk(invs, 10), chunkedInvs => {
        return Promise.all(chunkedInvs.map(cb));
    });
}

const writeToDisk = async (readStream, writePath, brandId) => {
    return new Promise((resolve, reject) => {
        readStream.on('error', () => {
            console.log(`Error in downloading file for ${brandId}`);
            resolve();
        })
        const writeStream = fs.createWriteStream(writePath);

        const pipedStream = readStream.pipe(writeStream);

        pipedStream.on('close', (e) => {
            if (e) {
                console.log(`Error in downloading file for ${brandId}`);
                return reject(e);
            }

            resolve();
        });
    })
}

const S3 = new aws.S3();
async function* listAllKeys(opts) {
    let params = { ...opts };
    do {
      const data = await S3.listObjectsV2(params).promise();
      params.ContinuationToken = data.NextContinuationToken;
      yield data;
    } while (params.ContinuationToken);
  }

const main = async () => {
    try {
        const brands = await asyncParse('./input.csv');

        console.log("================= Total Brands =====================");
        console.log(`Total brands: ${brands.length}`)

        await chunkedIteration(brands, async brand => {
            let brandId = brand.brand;
            let brandName = brand.brand_name;
            console.log('fetching for brand : ' + brandId);

            
            //reading the files in S3 
            try {
                let opts = {
                    Bucket: BUCKET_NAME,
                    Prefix: brandId,
                };
                let arr = [];
                for await (const data of listAllKeys(opts)) {
                    arr.push(data.Contents);
                }
                if(arr[0].length > 0) {
                    console.log("Brand found ",brandId)
                    arr = arr.flat(1).map(item => item.Key);
                    const promises = arr.map(async (key) => {
                        const readStream = S3.getObject({
                            Bucket: BUCKET_NAME,
                            Key: key
                        }).createReadStream();

                        fs.mkdirSync(`output-folder-brand/${brandName}`, { recursive: true })

                        const writePath = `output-folder-brand/${brandName}/${path.basename(key)}`;

                        return writeToDisk(readStream, writePath, brandId);
                    });
                    await Promise.all(promises);
                }else {
                    console.log("Brand not found ",brandId)
                }

            } catch (error) {
                console.log(`Something went wrong while fetching ${brandId}`);
                console.log(error);
            }
        })

        console.log('THIS IS DONE..... Please find the data in mentioned folder path - ref code: const writePath');
    } catch (error) {
        console.error(error);
    }
}
main();
