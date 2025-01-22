# Hide and Un-hide events from Algolia Search

We have the use-case to hide certain events from being searched on Algolia search on insider.in

We can use these script for that purpose.

For eg: If we need to hide all the screening events during an IPL go live


## How to run the Script

### Prerequisites:

Steps:

1. Store all the event _id by querying MongoDB for your use-case.
2. Get the event _ids in the format `Array<String>`
3. Store all the events you want to hide/unhide on the `frequentTechopsScripts/hideUnhideEventFromAlgolia/eventIds.js/eventIds.js` file in the `eventIds` array.
   
For eg `frequentTechopsScripts/hideUnhideEventFromAlgolia/eventIds.js`:

```js
module.exports = {
    eventIds: [
    "65ddc3479d5aaa00082c4da5",
    "6618bb33e26f660007e86eb4",
    "6613b432885a1b0008a78a5a",
    "6613e020b8a9b00009badf06"
    ]
};
```

### Hide Event from Algolia Search:

Move into the `frequentTechopsScripts/hideUnhideEventFromAlgolia` directory

```bash
cd frequentTechopsScripts/hideUnhideEventFromAlgolia
nvm use
npm install
npm run prod-hide-events
```

### Unhide Event from Algolia Search

Move into the `frequentTechopsScripts/hideUnhideEventFromAlgolia` directory

```bash
cd frequentTechopsScripts/hideUnhideEventFromAlgolia
nvm use
npm install
npm run prod-unhide-events
```

### Delete Event from Algolia Search

Move into the `frequentTechopsScripts/hideUnhideEventFromAlgolia` directory

```bash
cd frequentTechopsScripts/hideUnhideEventFromAlgolia
nvm use
npm install
npm run prod-delete-events
```
