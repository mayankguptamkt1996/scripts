# Whitelist upsert

This is the script to insert the whitelist in to whitelist collection in logestics db.

## Checks:

Please confirm.
1. behaves_like : "seated" for all items
2. pre_printed : true for all items

## Steps:

1. CS-tech team will give the csv of item name,item id, barcode, row_no and seat_no(only for seated items).The format of csv can be found in maplist.csv file.

2. We need to confirm few things from cs-tech team before running the script.

   a. **discount_type** - this can be **sale OR complimentary** and update it accordingly in dataObj (line 57).

   b.**ticket_name** -
   For seated - `${datum["row"]}-${datum["seat_no"]}` <br />
   For non-seated - `${datum["item_name"]}`

3. Run npm i for downloading node-modules packages.

4. Uncomment the line 68(await operation) and run the script by this command `node whitelistUpsert.js`

5. For verification goto whitelist collection and verify the count.
