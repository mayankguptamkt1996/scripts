# Switch Addon Items for Old and New Buy Flow

In case we need to switch the event from Old to New Buy flow and vice-versa, we will need to switch the add-ons added on the main items as well.

This is because the New Buy flow supports addons with Item and Inventory params and the Old Buy flow does not.

For eg: If we switch an Old Buy flow event to New Buy flow - it will be compatible since the add ons did not have any item and inventory param.

But, If we switch a New Buy flow event to Old Buy flow, the event will fail at checkout if there are required Item and Inventory params in the add-on items since the old buy does not take input for the params on the add-ons.

If, in case we will need to switch to the Old Buy flow fallback, we will need to switch the addons too.

This scripts does exactly that -

## How to run the Script



### Prerequisites:

Both the scripts `useOldBuyFlow.js` and `useNewBuyFlow.js` takes one CSV input only

The input format is

```csv
eventId,itemId,newBuyFlowAddOn[;],oldBuyFlowAddOn[;]
6516812f72262fbb291922fb,659b6abcb5e2b00007477546,659bb7994729350007cade0d;65bb48d67eb8bf0007a1efed,65bb54629f2ec200076a837f;65ca2b9b053c2ac087359443
```

| Key                | Significance                                |
| ------------------ | ------------------------------------------- |
| eventId            | _id of the event                            |
| itemId             | _id of the item                             |
| newBuyFlowAddOn[;] | List of all the addons for the Old Buy flow |
| newBuyFlowAddOn[;] | List of all the addons for the New Buy flow |

Please Note: Do not remove `[;]` from the `newBuyFlowAddOn` and `oldBuyFlowAddOn` columns because it signifies the delimiter for Array


### Switch to OLD BUY FLOW:

Move into the `frequentTechopsScripts/switchNewOldBuyFlowItems` directory

```bash
cd frequentTechopsScripts/switchNewOldBuyFlowItems
nvm use
npm install
```

For Staging use NODE_ENV as `stage`, for Production use `prod`

```bash
NODE_ENV=<prod|stage> node useOldBuyFlow.js
```


### Switch to NEW BUY FLOW:

Move into the `frequentTechopsScripts/switchNewOldBuyFlowItems` directory

```bash
cd frequentTechopsScripts/switchNewOldBuyFlowItems
nvm use
npm install
```

For Staging use NODE_ENV as `stage`, for Production use `prod`

```bash
NODE_ENV=<prod|stage> node useNewBuyFlow.js
```
