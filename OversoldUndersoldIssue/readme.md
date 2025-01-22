#Oversold/undersold investigate

This Script Investigates the Undersold and Oversold issue
This Script takes input of Event id's in a array and checks all the items and SI of those items 
and in response provides different csv files w.r.t output as correct data, oversold/undersold issue data

##Steps
1.) npm i
2.) Put events in eventId array (line 13). Like this -> var eventId = ["...", "...",...];
3.) Run the script with command "node overSoldUnderSoldInvestigate.js"
4.) You will get 2 csvs. 
    a.) responseCorrectItemData-output.csv for no issue items.
    b.) responseUnderSoldItemData-output.csv for items which have oversold/undersold issue.