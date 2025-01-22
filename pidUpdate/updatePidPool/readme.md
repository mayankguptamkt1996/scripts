# Update Pid Pool
This is the script to Update the Pid pool along with the brands and events

## The Entire Process/Flow : 
1. CM team should create a brand according to the requirement
2. CM should provide the techops team to upload the PID's if its non-wepl/OCL (techops should ask for pool_name)
3. After Techops uploaded the pool using this script and did the relevent changes the cs team should create events -> Items and PID's will get auto picked from the pool.

## Steps for running script
-------------
1. to Set up node modules if required
`nvm use 18.12.1`
`npm i`

2. mention the input file name in the script to read the input csv for pidpool at line 55 for variable file_data.
	* Check the input csv format sample as pidpool.csv

3. Upadte the variables
	* eventId =  ["6430116ca44bd80008da7516"] / ["6430116ca44bd80008da7516","632afa12ef635a2b3a025802"]
	* brandId = "63b80e8b3841760008c36ca6"
	* brandmerchantName = "pool_name" // mention the pool_name given by CM team
	* apikey pull api key from tracks collection - for staging use staging apikey
	* userId pull userid from users collection - for staging use staging userid
	* EventUri : assign as per requirement Stage or Prod by default its Stage
	* BrandUri : assign as per requirement Stage or Prod by default its Stage

5. Uncomment the connection string as per requirement

6. run the script using the command: node insertPidPool.js

7. Verify the data after running script 
	* paytmproductids collection for pidpool
	* brands collection (check for merchant object should have pid_pool:"pool_name")
	* events collection (check for payout_to should be payout_to :"brand_mid")

Note: If you want to have a log of all your runs, pipe the 'console.log' in a `.txt` file, like this: 
`node insertPidPool.js > [path-to-file].txt`
for eg: 
```
node insertPidPool.js > ~/Desktop/pidlogs.txt
```
