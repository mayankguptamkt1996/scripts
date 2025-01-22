# Clone Non Seated Item Ids to a Event

This script clones the **non seated items** to the first show (if the show already exists appends to it, else creates a show).

#### Guide

1. Get the csv data for the team, use the `sample-input-data/items-sample.csv` and `sample-input-data/pid-pool.csv`.
   - If they don't provide the PID on the items csv (until we have a required to set particular pid on an item), then please ensure to get the pid pool, refer the sample for details.
   - IMP: also the event that you want to clone to should ideally have a show created without item group, else this will add a show, which we would need to update later as the data will be dummy
   - Incase there is already a show, it will append all the items & item groups to the first show.
2. Add these files to script directory.
3. Rename these files to correct names `items.csv` for one with items, and `pid-pool.csv` for one with PIDs.
4. (Skip if you already ran this script earlier) Run this the following command if you are doing this for the first time.

```sh
nvm use
npm i
```

5. This script has an option to dry run, which you can safely execute, as this doesn't update the DB (Please make sure you have not update the script, then you are on your own).

```sh
npm run script:dry
```

6. This will output the results to file: `output/dry-run.txt`
   - Check the output, and ensure everything is fine.
   - Incase of error in the CSV or Data, Inform CS
   - After getting the updated CSV, run this step again, until you get the current output
7. Once everything passes on the dry run, we will run the final script

```sh
npm run script:final
```

8. This will output to file: `output/final-run.txt` and will output the created items to file: `output/results/created-items-for-event-<event_id>.csv` (This will be created for each event you are cloning these items to).

9. Check the logs so see the everything went correctly, and inform the team.
