const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');
const { timeStamp } = require('console');
const { console } = require('inspector');

const jsonFilePath = './prod_users_brand.json';
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

function hasOnlyBrandPermissions(user) {
    const permissionFields = [
        'edit_permissions',
        'assign_permissions',
        'export_permissions',
        'viewSales_permissions',
        'redeem_permissions',
        'issue_permissions',
    ];

    return permissionFields.every((field) =>
        user[field].every((group) =>
            group.every((permission) => permission.type === 'Brand')
        )
    );
}

const filteredUsers = jsonData.filter(hasOnlyBrandPermissions);

const csvFields = [
    '_id',
    'email',
    'count',
    'phone_number',
    'edit_permissions',
    'assign_permissions',
    'export_permissions',
    'viewSales_permissions',
    'redeem_permissions',
    'issue_permissions',
];
const csvData = filteredUsers.map((user) => ({
    _id: user._id.$oid,
    email: user.email,
    count: user.count,
    phone_number: user.phone_number?.join(', ') || '',
    edit_permissions: user.edit_permissions
        .flat()
        .map((p) => p.type+","+(p._id.$oid === undefined)?"":p._id.$oid)
        .join(', '),  
    assign_permissions: user.assign_permissions
        .flat()
        .map((p) => p.type+","+(p._id === undefined)?"":p._id.$oid)
        .join(', '),
    export_permissions: user.export_permissions
        .flat()
        .map((p) => p.type+","+(p._id === undefined)?"":p._id.$oid)
        .join(', '),
    viewSales_permissions: user.viewSales_permissions
        .flat()
        .map((p) => p.type+","+(p._id === undefined)?"":p._id.$oid)
        .join(', '),
    redeem_permissions: user.redeem_permissions
        .flat()
        .map((p) => p.type+" "+(p._id === undefined)?"":p._id.$oid)
        .join(', '),
    issue_permissions: user.issue_permissions
        .flat()
        .map((p) => p.type+","+(p._id === undefined)?"":p._id.$oid)
        .join(', '),
    timestamp_added: user.timestamp_added,
    acl_role_id: user.acl_role_id,
    is_active:user.is_active,
}));


const csv = parse(csvData, { fields: csvFields });


const outputCsvPath = './filtered_users.csv';
fs.writeFileSync(outputCsvPath, csv);

console.log(`Filtered users saved to ${outputCsvPath}`);