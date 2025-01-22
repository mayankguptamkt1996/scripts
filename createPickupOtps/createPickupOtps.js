/*
This script will be used to generate the Pick OTP's whenever requested.
*/
var csvjson = require('csvjson');
const fs = require('fs');
const papaparse = require('papaparse');
var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};
var file_data = fs.readFileSync('input.csv', { encoding: 'utf8' });
const csvData = csvjson.toObject(file_data, options);
let responseOtpData = [];
const generateHashedPinForVerification = (transactionId, shortcode) => {
    //const hasheEencodedString = btoa(transactionId + shortcode);
    const hasheEencodedString = Buffer.from(transactionId + shortcode).toString('base64');
    const finalVerificationPin = hasheEencodedString
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(-4);
    return finalVerificationPin;
};
console.log("Total no. OTP's to generate : ",csvData.length)
const main = async () => {
try {
    if (csvData.length>0) {
        for(let i =0;i<csvData.length;i++) {
            var transactionId = csvData[i].TransactionID;
            var shortcode = csvData[i].Shortcode;
            var billingEmail = csvData[i].BillingEmail;
            var name = csvData[i].Name;
            var email = csvData[i].Email;
            var phone = csvData[i].Phone;
            var otp =  generateHashedPinForVerification(transactionId, shortcode);
            //console.log("OTP",otp)
            const pushOtpData = {
                "Billing Email" : billingEmail,
                "Name" : name,
                "Email" : email,
                "Phone" : phone,
                "Transaction ID" : transactionId,
                "Shortcode" : shortcode,
                "Pickup OTP" : otp
            }
            responseOtpData.push(pushOtpData);
            let rowsData = papaparse.unparse(responseOtpData);
            fs.writeFileSync(`./pickotpdata-output.csv`, rowsData);
        }
    }
} catch (error) {
    console.log("error",error);
}
}
main()
    .then(() => { console.log('---- Done ---- \n ------ Please find the Pickup OTPs in the output file -----'); process.exit(1) });