const aws = require('aws-sdk');
const fs = require('fs');
const async = require('async');

aws.config.update({
    accessKeyId: "AKIAI5OPC5GIXYA6NQZQ",
    secretAccessKey: "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",
    "region": "ap-south-1"
});

const S3 = new aws.S3();


// wrap this code in a loop for every deviceId
const DEVICE_IDS = []

DEVICE_IDS.map((id) => {
    console.log("id------>",id)
    const deviceId = id;
    const paramListing = {
        Bucket: `insider-cashless`,
        Prefix: `device_backups/release/${deviceId}`
    }

    const fetchData = async () => {
        const data = await new Promise((resolve, reject) => {
            S3.listObjectsV2(paramListing, (err, data) => {
                if (err) {
                    console.log('error is', err);
                    reject(err);
                }
                return resolve(data);
            });
        });
        var fileObj = data.Contents[data.Contents.length - 1];

        let key = fileObj?.Key;
        const fileName = key?.split('/')[3];
        let lastModified = fileObj?.LastModified;
        console.log("device",deviceId)
        console.log('Downloading: ' + key);

        // download file
        S3.getObject({
            Bucket: `insider-cashless`,
            Key: key
        }, (s3Error, zipData) => {
            if (s3Error) {
                console.log('getFileObject | Error in uploading data: ', s3Error);
                reject(s3Error);
            }
            else {
                fs.writeFileSync(`outputData/${deviceId}-${lastModified}-${fileName}`, zipData.Body.toString('utf-8'));
            }
        });
    };
    fetchData()
})