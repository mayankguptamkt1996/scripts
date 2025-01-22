/* 
This script is used to resend the comms on the basis of shortcodes (as an input).
*/

const _ = require('lodash');
const Promise = require('bluebird');
const fetch = require("node-fetch");
const path = require('path');
const parse = require('csv-parse/lib/sync');
const papaparse = require('papaparse');
const request = require('request-promise');
const fs = require('fs');

const SYS_NONE_EMAIL_USER_KEY =
	"6hf81654b1aca6qqufye87dc2a3f52a744327384119e4657b1c1fc900f24b8364";
const X_USER_ID = "57ad87b1a7c8cdd2e0f2caf6";


function timeStamp(message){
    console.log ( '[' + new Date().toISOString() + '] -', message )
}

async function main () {
    // let connection;
    timeStamp('here');

    const filePath = './resendShortcodes.csv'
    const output = [];

    
    try {
        const shortcodesData = parse(fs.readFileSync(path.join(__dirname, filePath)), {columns : true});
        
        // connection = await dbClient.connect(connectionString);
        // const coreDB = connection.db("insidercore");


        await Promise.map(shortcodesData, async (data) => {
            try {
                console.log({ data  });
                if(!data['Shortcode']) {
                    return Promise.resolve();
                }

                console.log({ data2: data  });
                
                const shortcode = data['Shortcode']
                console.log({ shortcode });

                const uri = `http://internal.insider.in/transaction/resend?shortcode=${shortcode}`;
                console.log({ uri });

                var options = {
                    method: 'GET',
                    uri,
                    headers: {
                        'Content-Type': 'application/json',
                        'API-KEY': '6hf81654b1aca6qqufye87dc2a3f52a744327384119e4657b1c1fc900f24b8364',
                        'X-User-Id': '57ad87b1a7c8cdd2e0f2caf6'
                    }
                };

                let result;
                try {
                    result = await request(options);
                } catch(e) {
                    console.log({ e});
                    throw e;
                }

                // const result = await fetch(
                //     `http://internal.insider.in/transaction/resend?shortcode=${shortcode}`,
                //     {
                //         method: "GET",
                //         headers: {
                //             'API-KEY': SYS_NONE_EMAIL_USER_KEY,
                //             'Content-Type': 'application/json',
                //             'X-User-Id': X_USER_ID
                //         }
                //     }
                // );
                // console.log({ result });
                // const status = result.status;
                // console.log({ result: status });
                // console.log(`Core response is ${status}`);
                output.push({
                    status: 'success',
                    shortcode: shortcode,
                    status: result,
                    error: null,
                    data: JSON.stringify(data)
                })
                return true;
            }
            catch (e) {
                console.error(e);
                console.log("failed for :", { data });
                output.push({
                    status: 'fail',
                    shortcode: '',
                    status: '',
                    error: e,
                    data: JSON.stringify(data)
                })
                return;
                // console.error(e);
                // console.log("failed for :", txn);
                // return
            }
    
        }, {concurrency: 1});
        
    } catch(e) {
        timeStamp({ e });
    } finally {
        
        timeStamp("closing connection");
        // connection.close();

        if(output.length > 0) {

            timeStamp({ count: output.length });

            console.log("****");
            timeStamp("WRITING TO FILE");
            let rowsData = papaparse.unparse(output);
            fs.writeFileSync(`./resend_output_${new Date().toISOString()}.csv`,rowsData);
        }
        return Promise.resolve();
    }
}

main().catch(console.error);

