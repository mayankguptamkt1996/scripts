This script is used to fetch the user details for transaction_id filter event_id.

Steps :-

1.) [skip if you already did] npm i
2.) Uncomment line 24 for db connection.
3.) Put all the transaction_id (for which you want to fetch the data) in input.csv file.
4.) Put the event_ids in eventIds line 20 in fetch.js. Script will fetch the data of the user who purchase the ticket for these event_ids.
5.) In line 48, change the csv name if you added the new csv file (of input transaction ids) in this folder.
6.) Now, run the script -> node fetch.js 
7.) Now, find the data in response_data.csv.
