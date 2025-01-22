const cloudinary = require('cloudinary').v2;
const { cloudinaryLinks } = require('./cloudinaryLinksToBeDeleted');

// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: 'dwzmsvp7f',
    api_key: '258676775254546',
    api_secret: 'take-from-dashboard-for-name-"Techops Delete Script"'
});

const BatchSize = 100;
const DelayBetweenBatches = 2000;  // 2 seconds delay between batches

// Function to delete resources in batches of 100
async function deleteResourcesByPublicIds(publicIds, batchSize = BatchSize) {
    const batches = [];

    // Split public IDs into batches of 100
    for (let i = 0; i < publicIds.length; i += batchSize) {
        batches.push(publicIds.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
        try {
            console.log("Going to delete batch:", JSON.stringify(batch));
            const result = await cloudinary.api.delete_resources(batch);
            console.log('Batch deletion result:', result);
        } catch (error) {
            console.error('Error deleting batch:', error);
        }

        // Delay between each batch to avoid rate-limiting
        await new Promise(resolve => setTimeout(resolve, DelayBetweenBatches));
    }
}

function getPublicIdFromUrl(url) {
    // Create a URL object to parse the input URL
    const urlObj = new URL(url);

    // Extract the pathname (part after domain)
    const path = urlObj.pathname;

    // Split the path into parts and remove empty entries
    const pathParts = path.split('/').filter(part => part);

    // Find the 'upload' or path where version number or publicId appears
    const uploadIndex = pathParts.indexOf('upload');
    
    // If the URL doesn't contain "upload", assume it's in the standard v<version>/<public_id>.<ext> format
    if (uploadIndex !== -1 && pathParts[uploadIndex + 1]) {
        const publicIdWithTransformations = pathParts.slice(uploadIndex + 1).join('/');

        // Match with transformations: v<version>/<public_id>.<extension>
        const publicIdMatch = publicIdWithTransformations.match(/v\d+\/(.+)\.[a-z0-9]+$/i);

        if (publicIdMatch && publicIdMatch[1]) {
            return publicIdMatch[1];  // Extract the public ID part
        }
    } else {
        // If there is no 'upload' in the URL, assume standard format like v<version>/<public_id>.<ext>
        const publicIdMatch = path.match(/v\d+\/(.+)\.[a-z0-9]+$/i);

        if (publicIdMatch && publicIdMatch[1]) {
            return publicIdMatch[1];  // Extract public ID from the simple case
        }
    }

    return null; // Return null if no valid public ID is found
}

async function main() {
    const cloudinaryLinksBatch = [];

    // Split cloudinary links into batches of 100
    for (let i = 0; i < cloudinaryLinks.length; i += BatchSize) {
        cloudinaryLinksBatch.push(cloudinaryLinks.slice(i, i + BatchSize));
    }

    // Process each batch and get public ids from link
    for (const cloudinaryLinks of cloudinaryLinksBatch) {
        const cloudinaryPublicIds = cloudinaryLinks.map(link => getPublicIdFromUrl(link)).filter(link => link && link.length);
        
        // Wait for each batch to finish before proceeding to the next
        await deleteResourcesByPublicIds(cloudinaryPublicIds);
    }
}

main();
