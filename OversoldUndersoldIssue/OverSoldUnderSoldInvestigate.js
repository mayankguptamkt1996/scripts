/**
 * This Script Investigates the Undersold and Oversold issue
 * This Script takes input of Event id's in a array and checks all the items and SI of those items 
 * and in response provides different csv files w.r.t output as correct data, oversold/undersold issue data
 * 
 */
const mongodb = require("mongodb");
const fs = require('fs');
const MongoClient = mongodb.MongoClient;
var mongoose = require('mongoose');
const papaparse = require('papaparse');

var eventId = ["677bca37cfcdc8922a627af4","677ce2598616441d0e1c4825","677ccbbff23be913a706ada2","677ce3c33bb4e3dbc1993d90","677cdfe6dfc7e52881004377","677cdd9c9338d657aaa29629","677cdc0f9338d657aaa29257","677cdcdd21845c2e7fb12fe4","677ce30610b70a52786e7c19","677cdaf9ae78a121dcea30ba"];

const main = async () => {
    // // PROD - Connection String
    const connectionString =
    "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

    //Staging - Connection String
    //const connectionString ="mongodb://insider:insidergratisbleh@localhost:27018/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false";
    const connection = await MongoClient.connect(connectionString);
    const core = connection.db('insidercore');
    const itemsdb = core.collection("items");
    const soldInvdb = core.collection("soldinventories");
    try {
    let responseCorrectItemData = [];
    let responseUnderSoldItemData = [];
    let responseOverSoldItemData = [];
    let responseErrorItemData = [];

    for (let i = 0; i < eventId.length; i++) {
    const itemdata = await itemsdb.find({ "parent.parent_id": new mongoose.Types.ObjectId(eventId[i]) }).toArray();
    for (let i = 0; i < itemdata.length; i++) {
        console.log("Checking...."); // This is for console activity
        const solddata = await soldInvdb.find({ item_id: new mongoose.Types.ObjectId(itemdata[i]._id),
        status:{$nin : ["refunded"]} }).toArray();
        if (solddata.length == itemdata[i].finite_amount_sold)
        {
            // console.log("================================================");
            // console.log("No Error");
            // console.log("Event id: "+itemdata[i].parent.parent_id);
            // console.log("Item Id: " + itemdata[i]._id);
            // console.log("================================================");
            const pushCorrectItemData = {
                Event_id : itemdata[i].parent.parent_id,
                Item_id : itemdata[i]._id
            } 
            responseCorrectItemData.push(pushCorrectItemData);
            let rowsData1 = papaparse.unparse(responseCorrectItemData);
            fs.writeFileSync(`./responseCorrectItemData-output.csv`, rowsData1);
        }
        else if(solddata.length < itemdata[i].finite_amount_sold)
        {
            // console.log("================================================");
            // console.log("UnderSold Issue");
            // console.log("Event id: "+itemdata[i].parent.parent_id);
            // console.log("Item Id: " + itemdata[i]._id);
            // console.log("Total Sold Tickets: "+ solddata.length);
            // console.log("Item's Finite amount sold: " + itemdata[i].finite_amount_sold);
            // console.log("================================================");
            const pushUnderSoldItemData = {
                Event_id : itemdata[i].parent.parent_id,
                Item_id : itemdata[i]._id,
                Sold_count : solddata.length,
                Item_FAS : itemdata[i].finite_amount_sold
            } 
            responseUnderSoldItemData.push(pushUnderSoldItemData);
            let rowsData2 = papaparse.unparse(responseUnderSoldItemData);
            fs.writeFileSync(`./responseUnderSoldItemData-output.csv`, rowsData2);
        }
        else if(solddata.length > itemdata[i].finite_amount_sold)
        {
            // console.log("================================================");
            // console.log("OverSold Issue");
            // console.log("Event id: "+itemdata[i].parent.parent_id);
            // console.log("Item Id: " + itemdata[i]._id);
            // console.log("Total Sold Tickets: "+ solddata.length);
            // console.log("Item's Finite amount sold: " + itemdata[i].finite_amount_sold);
            // console.log("================================================");
            const pushOverSoldItemData = {
                Event_id : itemdata[i].parent.parent_id,
                Item_id : itemdata[i]._id,
                Sold_count : solddata.length,
                Item_FAS : itemdata[i].finite_amount_sold
            } 
            responseOverSoldItemData.push(pushOverSoldItemData);
            let rowsData3 = papaparse.unparse(responseOverSoldItemData);
            fs.writeFileSync(`./responseOverSoldItemData-output.csv`, rowsData3);
        }
        else{
            console.log("Error in Fetching Result..");
            const pushErrorItemData = {
                Event_id : itemdata[i].parent.parent_id,
                Item_id : itemdata[i]._id
            } 
            responseErrorItemData.push(pushErrorItemData);
            let rowsData4 = papaparse.unparse(responseErrorItemData);
            fs.writeFileSync(`./responseErrorItemData-output.csv`, rowsData4);
        }
     }
    }

    } catch (e) {
        console.log("Error in fetching results");
    } finally {
        connection.close();
    }

}
main()
    .then(() => { console.log('---- Done ---- \n ------ Please find the relative files for results -----'); process.exit(1) });