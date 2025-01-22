/*
This script clones the **non seated items** to the first show (if the show already exists appends to it, else creates a show).
Doc link - https://wiki.mypaytm.com/pages/viewpage.action?pageId=425368180
*/

const csvjson = require("csvjson");
const fs = require("fs");
const path = require("path");
const Promise = require("bluebird");
const _ = require("lodash");
const { v4: uuidv4 } = require("uuid");
const ObjectsToCsv = require("objects-to-csv");
const moment = require("moment");

const { MongoClient, ObjectId } = require("mongodb");

// PROD DB
const mongoUrl =
  "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@rs0-shard-00-00-runtd.mongodb.net:27017,rs0-shard-00-01-runtd.mongodb.net:27017,rs0-shard-00-02-runtd.mongodb.net:27017/insidercore?ssl=true&replicaSet=rs0-shard-0&authSource=admin"

// Staging
// const mongoUrl =
//   "mongodb://" + process.env.MONGODB_USERNAME + ":" + process.env.MONGODB_PASSWORD + "@db1.stage.insider.in:27017?authSource=admin"

const client = new MongoClient(mongoUrl);
const dbName = "insidercore";

const FILE = "items3.csv";
const PID_POOL_FILE = "pids.csv";
const OUT_FILE_NAME = "created-items";

const NON_SEATED_VENDORS = ["non_seated", "phased_non_seated"];

const dryRunScript = String(_.get(process.env, "DRY_RUN", true)) === "true";

const CSV_HEADER_MAP = {
  cloneFromItemId: "Clone_From_Item_Id",
  cloneToEventId: "Clone_To_Event_Id",
  item: {
    name: "Name",
    pid: "Paytm_Product_Id",
    capacity: "Capacity",
    price: "Price",
  },
  phaseGroup: {
    name: "Phase_Group_Name",
    capacity: "Phase_Group_Capacity",
  },
};

const loadPidPool = async ({ Items }) => {
  const data = fs.readFileSync(path.join(__dirname, PID_POOL_FILE), {
    encoding: "utf8",
  });
  const options = {
    delimiter: ",", // optional
    quote: '"', // optional
  };

  const csvData = csvjson.toObject(data, options);

  const allPids = _.chain(csvData).map("ProductId").uniq().value();

  const pidsOnDB = await Items.find({ paytm_product_id: { $in: allPids } })
    .project({ paytm_product_id: 1 })
    .toArray();

  const usedPIds = _.map(pidsOnDB, "paytm_product_id");

  const validPids = _.difference(allPids, usedPIds);

  return {
    validPids,
    allPids,
    usedPIds,
  };
};

async function cloneItems({
  destEventId,
  csvData,
  phaseGroup,
  ItemGroupMap,
  Items,
  Events,
  validPids = [],
  showToCloneOn,
  session,
}) {
  console.log(`\n\nCloning for Event ${destEventId}`);

  // Group by Item Ids and names
  const items = _.groupBy(csvData, (d) => d[CSV_HEADER_MAP.cloneFromItemId]);

  const EventsMap = {};
  let allItemsToInsert = [];

  await Promise.mapSeries(_.entries(items), async ([itemId, datum]) => {
    // Query and get the item
    const item = await Items.findOne({
      vendor: { $in: NON_SEATED_VENDORS },
      _id: new ObjectId(itemId),
    });

    if (_.isEmpty(item)) {
      console.log("Item Not found! Please check the Item Id in the CSV");
      throw new Error("Invalid Args");
    }

    const cloneItemId = item._id.toString();
    const eventId = _.get(item, "parent.parent_id");

    if (!EventsMap[eventId]) {
      EventsMap[eventId] = {
        [cloneItemId]: {
          itemId: cloneItemId,
          clonedItems: [],
        },
      };
    } else {
      if (!EventsMap[eventId][cloneItemId]) {
        EventsMap[eventId][cloneItemId] = {
          itemId: cloneItemId,
          clonedItems: [],
        };
      }
    }

    // create a map from the items with custom name
    const itemsToInsert = datum.map((i) => {
      const itemToInsert = {
        _id: new ObjectId(),
        sku: uuidv4(),
        finite_amount_sold: 0,
        item_state: "unavailable",
        parent: {
          parent_id: new ObjectId(destEventId),
          parent_type: "event",
        },
      };

      if (!_.isEmpty(phaseGroup)) {
        itemToInsert["phaseGroup"] = phaseGroup;
        itemToInsert.vendor = 'phased_non_seated';
      } else {
        if (_.has(item, "phaseGroup")) {
          delete item.phaseGroup;
          itemToInsert.vendor = 'non_seated';
        }
      }

      if (!i[CSV_HEADER_MAP.item.name]) {
        console.error("Name is required");
        throw new Error();
      }

      if (!i[CSV_HEADER_MAP.item.pid] && _.size(validPids) === 0) {
        console.error(
          "Paytm_Product_Id is required And PID Pool is also empty"
        );
        throw new Error();
      }

      itemToInsert["name"] = i["Name"];
      itemToInsert["slug"] = i["Name"]
        .split(" ")
        .map((x) => x.toLowerCase())
        .join("-");

      if (_.size(validPids) > 0) {
        // Use Pid Pool to get the pid
        const pid = validPids.shift(0);
        itemToInsert["paytm_product_id"] = pid;
      } else {
        itemToInsert["paytm_product_id"] = i[CSV_HEADER_MAP.item.pid];
      }

      if (!!i[CSV_HEADER_MAP.item.capacity]) {
        const capacity = Number(i[CSV_HEADER_MAP.item.capacity]);

        if (Number.isNaN(capacity)) {
          console.error("Invalid capacity");
          throw new Error("capacity cannot be NaN");
        }

        itemToInsert["finite_amount_available"] = capacity;
      }

      if (!!i[CSV_HEADER_MAP.item.price]) {
        const price = Number(i[CSV_HEADER_MAP.item.price]);

        if (Number.isNaN(price)) {
          console.error("Invalid price");
          throw new Error("Price cannot be NaN");
        }

        itemToInsert["price"] = price;
        // not used but just to keep in parity with admin
        itemToInsert["prime_price"] = price;
      }

      // Set shows start time as the item availability
      if (_.has(showToCloneOn, 'start_utc_timestamp')) {
        const showStartTime = moment(_.get(showToCloneOn, 'start_utc_timestamp') * 1000);
        if (showStartTime.isValid()) {
          itemToInsert.availability_date = new Date(showStartTime.toISOString());
        }
      }

      return _.merge({}, item, itemToInsert);
    });

    allItemsToInsert = _.concat(allItemsToInsert, itemsToInsert);

    // Item to update on event
    EventsMap[eventId][cloneItemId].clonedItems = itemsToInsert.map((x) =>
      x._id.toString()
    );
  });

  const eventsFromDB = await Events.find({
    _id: {
      $in: Object.keys(EventsMap).map((id) => new ObjectId(id)),
    },
  }).toArray();

  const DBEventsMap = _.groupBy(eventsFromDB, (e) => e._id);

  console.log(`Inserting ${allItemsToInsert.length} items to DB`);

  // Insert Items to DB
  if (!dryRunScript) {
    await Items.insertMany(allItemsToInsert, { session });

    const createdItems = allItemsToInsert.map((x) => ({
      ["Item Id"]: String(x._id),
    }));
    const csv = new ObjectsToCsv(createdItems);
    await csv.toDisk(
      path.join(
        __dirname,
        `output/results/${OUT_FILE_NAME}-for-event-${destEventId}.csv`
      ),
      {
        append: true,
      }
    );
  } else {
    console.log(
      "Inserting these items to DB: >> ",
      JSON.stringify(allItemsToInsert, null, 4)
    );
  }

  console.log(`Successfully inserted items`);

  _.each(_.entries(EventsMap), ([eventId, itemsToAdd]) => {
    const event = DBEventsMap[eventId][0];

    _.each(_.entries(itemsToAdd), ([itemId, itemDetails]) => {
      _.each(event.venues[0].shows, async (show) => {
        const nonSeatedIGs = _.filter(
          show.items_for_sale,
          (ig) => ig.item_group_type === "ticket"
        );

        _.each(nonSeatedIGs, async (ig) => {
          const items = ig.items.map(String);

          // If the main item exists add cloned items to the event
          if (items.includes(itemId)) {
            if (!ItemGroupMap[ig.name]) {
              ItemGroupMap[ig.name] = {
                data: {
                  _id: new ObjectId(),
                  name: ig.name,
                  is_available: ig.is_available,
                  item_group_image: ig.item_group_image,
                  item_group_type: ig.item_group_type,
                  items: itemDetails.clonedItems.map((i) => new ObjectId(i)),
                  timestamp_added: new Date(),
                  timestamp_updated: new Date(),
                },
              };
            } else {
              ItemGroupMap[ig.name].data.items = _.concat(
                ItemGroupMap[ig.name].data.items,
                itemDetails.clonedItems.map((i) => new ObjectId(i))
              );
            }
          }
        });
      });
    });
  });
}

const main = async () => {
  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    const Items = db.collection("items");
    const Events = db.collection("events");

    const { allPids, validPids = [], usedPIds } = await loadPidPool({ Items });

    const data = fs.readFileSync(path.join(__dirname, FILE), {
      encoding: "utf8",
    });
    const options = {
      delimiter: ",", // optional
      quote: '"', // optional
    };

    const csvData = csvjson.toObject(data, options);

    if (_.size(csvData) > _.size(validPids)) {
      console.log(
        "Not enough valid PIDs, shared PIDs are already linked to items, Please provide more PIDs to PID Pool"
      );
      console.log("Used Pids (can't be used): >> ", usedPIds);
      console.log("Valid Pids (that can be used): >> ", validPids);
      throw new Error();
    }

    const groupedByDestEvents = _.groupBy(
      csvData,
      (d) => d[CSV_HEADER_MAP.cloneToEventId]
    );

    await Promise.mapSeries(
      _.entries(groupedByDestEvents),
      async ([destEventId, data]) => {
        // Staging DB doesn't have replica set so commenting db txn part for now
        const session = client.startSession();
        const transactionOptions = {
          readPreference: "secondary",
          readConcern: { level: "local" },
          writeConcern: { w: "majority" },
        };

        try {
          await session.withTransaction(async () => {
            const eventToCloneOn = await Events.findOne({
              _id: new ObjectId(destEventId),
            });

            if (_.isEmpty(eventToCloneOn)) {
              console.error("Event to clone items on does not exists!");
              throw new Error();
            }

            const ItemGroupMap = {};

            const showToBeAdded = {
              is_hidden: false,
              sold_out: false,
              seats_svg: "",
              settled: false,
              _id: new ObjectId(),
              items_for_sale: [],
              date_string: "Cloned Show",
              start_utc_timestamp: moment().add(1, "d").valueOf() / 1000,
              end_utc_timestamp: moment().add(10, "d").valueOf() / 1000,
              description: "Cloned Show",
            };

            // clones items to the first show
            const showToCloneOn = _.get(
              eventToCloneOn,
              "venues.0.shows.0",
              showToBeAdded
            );

            const phaseGroups = _.groupBy(
              data,
              (d) => d[CSV_HEADER_MAP.phaseGroup.name] || "NA"
            );

            await Promise.mapSeries(
              Object.entries(phaseGroups),
              async ([phaseGroupName, datum]) => {
                let phaseGroup;
                if (phaseGroupName !== "NA") {
                  // create the phase group
                  const phaseGroupObj = datum[0];
                  const capacity = Number(
                    phaseGroupObj[CSV_HEADER_MAP.phaseGroup.capacity]
                  );
                  if (Number.isNaN(capacity)) {
                    console.error("Invalid capacity");
                    throw new Error("Phase group");
                  }

                  phaseGroup = {
                    _id: new ObjectId(),
                    capacity,
                    finite_amount_sold: 0,
                    name: phaseGroupObj[CSV_HEADER_MAP.phaseGroup.name],
                  };
                }

                await cloneItems({
                  destEventId,
                  csvData: datum,
                  phaseGroup,
                  ItemGroupMap,
                  Items,
                  Events,
                  validPids,
                  showToCloneOn,
                  session,
                });
              }
            );

            _.chain(ItemGroupMap)
              .values()
              .map("data")
              .each((ig) => showToCloneOn.items_for_sale.push(ig))
              .value();

            // Adds all the cloned items and item groups to the dest event's first show
            if (!dryRunScript) {
              await Events.updateOne(
                {
                  _id: new ObjectId(destEventId),
                },
                {
                  $set: {
                    "venues.0.shows.0": showToCloneOn,
                  },
                },
                { session }
              );
            } else {
              console.log(
                "Adding Show to event",
                JSON.stringify(showToCloneOn, null, 4)
              );
            }

            console.log(`Cloned Items Successfully to Event ${destEventId}`);
          }, transactionOptions);
        } finally {
          await session.endSession();
        }
      }
    );
  } catch (e) {
    console.log(e);
  } finally {
    if (client.close) {
      client.close();
    }
  }
};

main()
  .then(() => process.exit(0))
  .catch(console.error);