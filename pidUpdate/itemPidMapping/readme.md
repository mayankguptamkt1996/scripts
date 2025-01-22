# Map Product IDs to Item IDs

This script maps the Product id to the Item Ids (If the product Ids is_used needs to be true and pid_pool must be mapped to brand and event.) 

#### Guide

1. Get the csv data from the team, use the `pidupdate.csv`.
   - If they don't provide the PID on the items csv (until we have a required to set particular pid on an item), then please ensure to get the pid pool.
   - If payout_to in event collection is wepl and event contacted to in brand collection is wepl then take the product ids from paytmproductids collection and mark their is_used true.
3. In pid_update.js update the csv name at line 30
4. Run node pid_update.js and then the mapping will get started.


5. Check for the Total Updated Pids the count must be same as the number of item IDs and product IDs.


6. The output can be seen in the file named 'pidupdate_response.csv' and also check for the errors in the same file.

