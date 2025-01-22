# Fetch delivery_email and billin_email from txn collection on the basis of txn_id

This script fetches delivery_email and billin_email from txn collection on the basis of txn_id.

This can be done directly from db but script can be used if we have request over 0.1 M(1 lakh) records to fetch

#### Guide

1. Get the csv data from the team, use the `txn_ids.csv`.
2. In fetchUserEmail.js update the csv name at line 58
3. Run node fetchUserEmail.js
4. The output can be seen in the file named `results.csv`.
