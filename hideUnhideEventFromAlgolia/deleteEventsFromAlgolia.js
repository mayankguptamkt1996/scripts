const config = require('./config')[process.env.NODE_ENV || 'stage'];
const algoliasearch = require('algoliasearch');
const client = algoliasearch(config.algolia.applicationID, config.algolia.secretKey);
const index = client.initIndex('events');
const {eventIds} = require('./eventIds');

const deleteIndexesFromAlgolia = async () => {
	for(let i=0; i<eventIds.length; i++){
		let eventId = eventIds[i];
		console.log(`Delete from Algolia Event Id: ${eventId}------------------>`)
		try {
			const content = await index.deleteObjects([eventId]);
			console.log(`Response - ${JSON.stringify(content)}`);
			console.log(`Event Id = ${eventId} has been deleted from Algolia`);
		} catch (error) {
			console.error(`Failed to delete event from Algolia  - _id: ${eventId}`, error);
		}
		finally{
			console.log(`<------------------>`)
		}
	}
}

deleteIndexesFromAlgolia();