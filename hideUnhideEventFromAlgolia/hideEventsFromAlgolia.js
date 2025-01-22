const config = require('./config')[process.env.NODE_ENV || 'stage'];
const algoliasearch = require('algoliasearch');
const client = algoliasearch(config.algolia.applicationID, config.algolia.secretKey);
const index = client.initIndex('events');
const blacklistedTagId = config.blacklistedTagId;
const {eventIds} = require('./eventIds');

const addBlacklistTagFromIndex = async () => {
	for(let i=0; i<eventIds.length; i++){
		let eventId = eventIds[i];
		console.log(`Add Blacklist Tag to Event Id: ${eventId}------------------>`)
		try {
			const content = await index.partialUpdateObject({
				tagids: {
					_operation: 'AddUnique',
					value: blacklistedTagId,
				},
				objectID: eventId,
				createIfNotExists: false
				});
			console.log(`Response - ${JSON.stringify(content)}`);
			console.log(`Event Id = ${eventId} has been updated in to Algolia`);
		} catch (error) {
			console.error(`Failed to update event with blacklisted tag - _id: ${eventId}`, error);
		}
		finally{
			console.log(`<------------------>`)
		}
	}
}

addBlacklistTagFromIndex();