# Clone user permissions

This script clone the permissions of one user to n number of users.

Step 1 : Fetch the user Id from the emails mentioned in the input.csv
Step 2 : Fetch the permissions doc of the user id defined CLONE_FROM_USER_ID here
Step 3 : Call the API - permission/upsert for every permission

#### Steps

1. Get the emails from the team, use the `input.csv`.
2. Update the `CLONE_FROM_USER_ID` variable with the user id of the user whose permissions needs to be cloned.
3. Update the `X_USER_ID`,`API_KEY`,`AuthorizationToken` with the person runing the scipt,same person's API Key and API Token.
4. Run node clonePermission.js
5. The output can be seen in the file named `ouput.csv`.
