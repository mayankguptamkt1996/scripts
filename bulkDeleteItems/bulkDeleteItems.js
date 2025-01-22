const mongodb = require("mongodb");
const _ = require("lodash");
//const fs = require("fs");
//const path = require("path");
const Promise = require("bluebird");

const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;

const mongoUrl =
  "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/admin?ssl=true&replicaSet=rs0-shard-0&readPreference=secondaryPreferred&connectTimeoutMS=10000&authSource=admin&authMechanism=SCRAM-SHA-1";

// Event Ids to be edited - We will delete all the items and item groups from this event
const eventIds = ["622f31ac853ff00008f49b76"];

// Items Ids to be deleted - We will delete all the items
const itemIds = ["62358e3921c830000881c3e7"];

// If set to true, it will delete all the empty item groups from the event
const ShouldDeleteEmptyItemGroups = false;

// Manual checks to make sure database exports are taken before running this script
// Mark this as true once you take exports
const HaveTakenDBExportForEvent = true;
const HaveTakenDBExportForAllItemIds = true;

async function assign() {
  if (!HaveTakenDBExportForEvent || !HaveTakenDBExportForAllItemIds) {
    throw new Error("Please take the DB exports for event and items first");
  }
  let connection;
  try {
    connection = await MongoClient.connect(mongoUrl, {
      promiseLibrary: Promise,
    });
    const db = connection.db("insidercore");
    const Events = db.collection("events");
    const Items = db.collection("items");

    return await Promise.each(eventIds, (eventId) => {
      return new Promise(async (resolve, reject) => {
        try {
          const itemsArray = await Items.find({
            "parent.parent_id": ObjectId(eventId),
          }).toArray();
          const eventObj = await Events.findOne({ _id: ObjectId(eventId) });
          await Promise.each(itemsArray, (item) => {
            return new Promise(async (resolve, reject) => {
              if (itemIds.includes(String(item._id))) {
                console.log(`Event - ${eventId}, Item - ${item._id}`);
                await Items.deleteOne({ _id: item._id });
                console.log(`Event - ${eventId}, Item - ${item._id} Deleted`);
              }
              resolve();
            });
          });
          let venues = eventObj.venues;
          let newVenue = venues.map((venue) => {
            let newShow = venue.shows.map((show) => {
              let new_items_for_sale = [];
              show.items_for_sale.forEach((itemForSale) => {
                let newItems = [];
                itemForSale.items.forEach((item, index) => {
                  if (!itemIds.includes(item.toString())) {
                    newItems.push(item);
                  }
                });
                if (ShouldDeleteEmptyItemGroups) {
                  if (newItems && newItems.length) {
                    new_items_for_sale.push({
                      ...itemForSale,
                      items: newItems,
                    });
                  }
                } else {
                  new_items_for_sale.push({
                    ...itemForSale,
                    items: newItems,
                  });
                }
              });
              return { ...show, items_for_sale: new_items_for_sale };
            });
            return { ...venue, shows: newShow };
          });
          await Events.updateOne(
            { _id: ObjectId(eventId) },
            { $set: { venues: newVenue } }
          );
          resolve();
        } catch (e) {
          console.log("error", e);
          reject(e);
        }
      });
    });
  } catch (e) {
    console.error(e);
  } finally {
    connection.close();
  }
}

assign().catch(console.error);
