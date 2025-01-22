## Pre-assign roles

This is the script to assign a role to an email for the live_events.

## Steps

1.) Goto line 24, 25, 26, 27 change the live_event_id, core_event_id, stage_id, role as per given details.
2.) core_event_id, stage_id(from reciepe) to be fetched from ngage database.
3.) line 31, add your user_id.
4.) Goto file participants.csv as it is used in line 73. Change the details Name, emailid as per request in the csv file.
5.) After saving all the changes run "node preassignRoles.js"
6.) And to verify we can check in permissions table :  
    select * from permissions p where live_event_id  = 'live_event_id'