# Stash Debit

This is the script to debit the stash to user's account based on user's email.

## Steps:

1. Enter the user's email_id and the amount of stash which needs to be debited in the input.csv present in the same directory.

2. The script needs the API key for the person who is crediting the amount.

3. Goto DB(mongo db), open users collection and search → {"normalized_email" : "your_email_id"} Copy your userId.
   Goto tracks collection and search → { "user_id" : ObjectId("copied_userid ") } and copy the api-key for any document.

4. Search for api-key(insider headers of the API) and replace it with the copied key.

5. Run the script by this command `node stashDebit.js`

6. Insider output folder a csv is generated of the API response if the stash debit was successfull or not. This csv can be given to cs-tech/ops for verification.

7. For verification goto admin website → transactions → search with email id of the user → verify debited stash amount.
