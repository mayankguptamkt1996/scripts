# Unlock key

This is the script to seed unlock keys/codes/passcodes to the db.

## Setting up item restrictions

1. Get the Event link for which we are setting the items restrictions.
2. Get all the item ids and item names of the event.
3. CS/OPs will give an excel listing which members should have access to which item/stand and what shall be the members restrictions.
4. Group all the unlock keys/passcodes shared with you by Member type, basically each member type will have its separate csv with unlock keys/passcodes.
5. When you run the script for each member type, you will need to update the script, as per the Excel (layout) shared with you:
   ```javascript
   await seedData(
     Item,
     List,
     // list name
     "Vaibhav-Member-list",
     // item ids the member has access to
     [
       // pav stand - item id
       ObjectId("62835f55c17bc47be55ffa1e"),
       // a stand - item id
       ObjectId("62835f96c17bc47be55ffa2b"),
       // b stand - item id
       ObjectId("62835fd3c17bc47be55ffa36"),
     ],
     // codes you read from the csv
     Codes.map((e) => e),
     // max redemption limit (overall limit) for this member type shared on the excel sheet
     3,
     // item restriction section - incase none, keep it as empty array
     [
       {
         // item id for which you are setting the restiction
         id: ObjectId("62835f55c17bc47be55ffa1e"),
         restrictions: {
           // max limit mentioned for this member type on this item (from Excel)
           maxLimit: 2,
         },
       },
       {
         id: ObjectId("62835f96c17bc47be55ffa2b"),
         restrictions: {
           maxLimit: 4,
         },
       },
       {
         id: ObjectId("62835fd3c17bc47be55ffa36"),
         restrictions: {
           maxLimit: 2,
         },
       },
     ]
   );
   ```
   - Update the csv path you'r reading to get codes/unlock keys/passcodes as per the member type
     - **NOTE: please confirm that the unlock keys provided to you are unique specially when the list name is kept the same**
   - Update list name based on the something meaningful - < event >-memberlist
     - **NOTE: Incase you are setting the item restictions for different members on the same items. Please keep the list name same in that case for all the members**
   - Update max redemption count or overall count as per mentioned in the Excel
   - Set the item restrictions as per the layout on the Excel, you will need to add the item id and match the maxLimit with what is mentioned on the layout, do this for all items incase of multiple items
