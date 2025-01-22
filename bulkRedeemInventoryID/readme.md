This script is used to redeem the inventory ids.
Doc link - https://wiki.mypaytm.com/pages/viewpage.action?pageId=372259382

Steps - 

Case 1: On the basis of shortcode

1.) Take all the shortocodes and search in soldinventories collection and fetch id (inventory id), item_id and shortcode. Follow doc for queries.
2.) Confirm the number of tickets(count of fetched data) with ops team before running the script.
3.) Paste the csv path in line 36 and provide the csv fields as mentioned in inventoryId.csv
4.) Now, confirm all the inventory are redeemed or not.
    i) By output file which will create after successful run of script. 200→ success, 400→ some error.
    ii) Check the soldinventories collection, redeemed: true for all inventory.

Case 2: basis of qrcode/barcode

1.) Take all barcodes/qrcodes and check this in insiderlogistics → barcodes. Follow doc for query.
2.) Now, you got all the inventory_ids, now search all in soldinventories collection. Do the same process as we do in Case 1: On the basis of shortcode, only change in step 1, search by inventory_id not shortcodes.