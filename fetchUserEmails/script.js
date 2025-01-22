const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

// Read input JSON file
const inputFilePath = 'all_user_data.json'; // Update with your input JSON file path
const outputFilePath = 'all_user_permissions.csv'; // Desired output CSV file path

// Utility function to check if all permission types are "Brand"
// const isAllPermissionsBrand = (permissions) => {
//   return permissions.every((group) =>
//     group.every((permission) => permission.type === 'Brand')
//   );
// };

// Main function to process JSON data
const processJson = async () => {
  try {
    // Read and parse JSON file
    const data = JSON.parse(fs.readFileSync(inputFilePath, 'utf-8'));

    // Filter users with only "Brand" permissions
    // const filteredUsers = data.filter((user) => {
    //   return (
    //     isAllPermissionsBrand(user.edit_permissions || []) &&
    //     isAllPermissionsBrand(user.assign_permissions || []) &&
    //     isAllPermissionsBrand(user.export_permissions || []) &&
    //     isAllPermissionsBrand(user.viewSales_permissions || []) &&
    //     isAllPermissionsBrand(user.issue_permissions || [])
    //   );
    // });

    // Map filtered data to CSV fields
    const csvFields = [
      '_id',
      'email',
      'phone_no',
      'count',
      'edit_permissions',
      'assign_permissions',
      'export_permissions',
      'viewSales_permissions',
      'redeem_permissions',
      'issue_permissions',
      'timestamp_added',
      'acl_role_id',
      'is_active'
    ];

    const csvData = data.map((user) => ({
      _id: user._id?.$oid || '',
      email: user.email|| "",
      phone_no: user.phone_number || 0,
      count: user.count || 0,
      edit_permissions: JSON.stringify(user.edit_permissions || []),
      assign_permissions: JSON.stringify(user.assign_permissions || []),
      export_permissions: JSON.stringify(user.export_permissions || []),
      viewSales_permissions: JSON.stringify(user.viewSales_permissions || []),
      redeem_permissions: JSON.stringify(user.redeem_permissions || []),
      issue_permissions: JSON.stringify(user.issue_permissions || []),
      timestamp_added: user.timestamp_added || "",
    acl_role_id: user.acl_role_id || '',
    is_active: user.is_active || '',
    }));

    // Convert data to CSV format
    const csv = parse(csvData, { fields: csvFields });

    // Write CSV to file
    fs.writeFileSync(outputFilePath, csv);
    console.log(`CSV file saved to: ${outputFilePath}`);
  } catch (error) {
    console.error('Error processing JSON:', error);
  }
};

// Run the function
processJson();
