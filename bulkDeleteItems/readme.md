This script is used to delete items and item groups
Doc link - https://wiki.mypaytm.com/display/INSIDER/Documentation+-+Delete+items+and+item+groups

Steps -

1. Delete items and item groups

2. First, Export all the docs of event and all items from db.

3. In line 14, put the event id of that items (items shared by ops team).

4. In line 17, put all the items (which need to delete).

5. If ops team said to delete item groups too, then make ShouldDeleteEmptyItemGroups (line 20) to true.

6. Now, if you did the export (point 2) then make HaveTakenDBExportForEvent (line 24) and HaveTakenDBExportForAllItemIds (line 25) as true.

7. Now, run the script and check in db, items should we delete.
