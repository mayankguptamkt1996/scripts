# Bulk DE pdf's download
This is the script to download all the DE (digital entry) pdf's on the basis of shortcodes.

## Steps for the same
-------------
1. to Set up node modules if required
`nvm use`
`npm i`

2. mention the input file name in the script to read shortcodes
3. mention the output folder in the script where the output need to store.
  3.1. please create an output folder if it doesn't exist.

4. run the script using the command: node download-digital-entry-pdfs.js

Note: If you want to have a log of all your runs, pipe the 'console.log' in a `.txt` file, like this: 
`node download-digital-entry-pdfs.js > [path-to-file].txt`
for eg: 
```
node download-digital-entry-pdfs.js > ~/Desktop/downloadlogs.txt
```


# Bulk invoices download for an event
This Script helps you to download invoices from S3

## Steps Bulk invoices download for an event
1.) Paste the event id in line 16 and run the script.
2.) It will give you invoices which are not in refunded state in db in output-folder.

# Bulk Documents download for brands
This Script helps you to download documents of the brands

## Steps for Bulk Documents download for brands
1.) Goto downloadBrandDocuments.js
2.) In line 62, Add input csv (format → brand,brand_name). Please check input.csv.
3.) Run the script, you will get output in output-folder-brand folder.