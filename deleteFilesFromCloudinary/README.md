# Delete objects from Cloudinary

This script takes in a array of cloudinary links and deletes them from our cloudinary resources

## Data Input/Output
#### Sample Input

```js
const cloudinaryLinks = [
    "https://media.insider.in/image/upload/c_crop,g_custom/v1728028066/trsytzxjrripy7mwukxh.jpg",
    "https://media.insider.in/image/upload/c_crop,g_custom/v1726492525/j5f7cpthptcfsbsdrik1.jpg"
];

module.exports = {
    cloudinaryLinks
};
```

#### Sample Output
```
Going to delete batch: ["trsytzxjrripy7mwukxh","j5f7cpthptcfsbsdrik1"]
Batch deletion result: {
  deleted: { trsytzxjrripy7mwukxh: 'deleted', j5f7cpthptcfsbsdrik1: 'deleted' },
  deleted_counts: {
    trsytzxjrripy7mwukxh: { original: 1, derived: 0 },
    j5f7cpthptcfsbsdrik1: { original: 1, derived: 1 }
  },
  partial: false,
  rate_limit_allowed: 5000,
  rate_limit_reset_at: 2024-10-21T15:00:00.000Z,
  rate_limit_remaining: 4998
}
```

## Run the script

To run on local, you will have to add env var NODE_TLS_REJECT_UNAUTHORIZED to get rid of error `unable to get local issuer certificate`

#### Steps to run:

```bash
cd frequentTechopsScripts/deleteFilesFromCloudinary
```

```bash
nvm use && npm i
```

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node src/deleteByPublicIds.js > log.txt
```

## Burst Cache on media.insider.in

#### Build Cache Invalidation on CF

Even after deleting these files from cloudinary, the media.insider.in link will still work because its cached for a very long time.
To burst the cache, use the [aws_cloudfront_cache_clear Jenkins Job](http://jenkins-mumbai.internal.insider.in/job/aws_cloudfront_cache_clear/) and select 
`media.insider.in Distribution Id` from the job description and run the build with `projectpaths` = `/image/upload/*` for images and `projectpaths` = `/*.pdf` for PDF

