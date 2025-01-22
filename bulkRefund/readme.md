# Bulk Refund
This is the script for bulk refund

## Steps for the same
1. [skip if already did] npm i
2. You can refund on the basis of shortcode/inventory_id/transaction_id/event_id/item_id/user_id.
3. Copy the data of filter on which you want to bulk refund.
4. In line 20, add your any api_key from tracks collection.
5. In line 21, add your user_id.
6. In line 31, paste the data.
7. execute command node bulkRefundUpdate.js
8. Now, you can verify using db(in soldinventories or transactions collection) or admin (in transaction section).