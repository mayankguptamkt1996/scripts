


const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

const inputFilePath = 'all_users_staging.json';
const outputFilePath = 'all_user_permissions_staging.csv'; 


const processJson = async () => {
  try {
    const data = JSON.parse(fs.readFileSync(inputFilePath, 'utf-8'));

    const csvFields = [
      '_id',
      'email',
      'phone_no',
      'count',
    'assign_permissions',
'brandDocuments_permissions',
'bulk_permissions',
'clevertap_permissions',
'close_account_permissions',
'communicate_permissions',
'creditWallet_permissions',
'customerSupporrt_permissions',
'customerSupport_permissions',
'customers_permissions',
'edit_permissions',
'editLogistics_permissions',
'editTransaction_permissions',
'export_permissions',
'finance_permissions',
'financeOld_permissions',
'get_tickets_permissions',
'handoverSheet_permissions',
'invoice_permissions',
'issue_permissions',
'issueWithCustomPrice_permissions',
'mapAwb_permissions',
'moviesAdmin_permissions',
'moviesWrite_permissions',
'open_account_permissions',
'payment_permissions',
'print_permissions',
'printBarcode_permissions',
'printTickets_permissions',
'queueConfiguration_permissions',
'redeem_permissions',
'refund_permissions',
'reviewTickets_permissions',
'seatedView_permissions',
'settle_permissions',
'techops_permissions',
'unprint_permissions',
'unprintTickets_permissions',
'unredeem_permissions',
'viewBuyerDetails_permissions',
'viewFollowStats_permissions',
'viewLogistics_permissions',
'viewSales_permissions',
      'timestamp_added',
      'acl_role_id',
      'is_active'
    ];

    const csvData = data.map((user) => ({
      _id: user._id?.$oid || '',
      email: user.email|| "",
      phone_no: user.phone_number || 0,
      count: user.count || 0,
      assign_permissions: JSON.stringify(user.assign_permissions || []),
    brandDocuments_permissions: JSON.stringify(user.brandDocuments_permissions || []),
    bulk_permissions: JSON.stringify(user.bulk_permissions || []),
    clevertap_permissions: JSON.stringify(user.clevertap_permissions || []),
    close_account_permissions: JSON.stringify(user.close_account_permissions || []),
    communicate_permissions: JSON.stringify(user.communicate_permissions || []),
    creditWallet_permissions: JSON.stringify(user.creditWallet_permissions || []),
    customerSupporrt_permissions: JSON.stringify(user.customerSupporrt_permissions || []),
    customerSupport_permissions: JSON.stringify(user.customerSupport_permissions || []),
    customers_permissions: JSON.stringify(user.customers_permissions || []),
    edit_permissions: JSON.stringify(user.edit_permissions || []),
    editLogistics_permissions: JSON.stringify(user.editLogistics_permissions || []),
    editTransaction_permissions: JSON.stringify(user.editTransaction_permissions || []),
    export_permissions: JSON.stringify(user.export_permissions || []),
    finance_permissions: JSON.stringify(user.finance_permissions || []),
    financeOld_permissions: JSON.stringify(user.financeOld_permissions || []),
    get_tickets_permissions: JSON.stringify(user.get_tickets_permissions || []),
    handoverSheet_permissions: JSON.stringify(user.handoverSheet_permissions || []),
    invoice_permissions: JSON.stringify(user.invoice_permissions || []),
    issue_permissions: JSON.stringify(user.issue_permissions || []),
    issueWithCustomPrice_permissions: JSON.stringify(user.issueWithCustomPrice_permissions || []),
    mapAwb_permissions: JSON.stringify(user.mapAwb_permissions || []),
    moviesAdmin_permissions: JSON.stringify(user.moviesAdmin_permissions || []),
    moviesWrite_permissions: JSON.stringify(user.moviesWrite_permissions || []),
    open_account_permissions: JSON.stringify(user.open_account_permissions || []),
    payment_permissions: JSON.stringify(user.payment_permissions || []),
    print_permissions: JSON.stringify(user.print_permissions || []),
    printBarcode_permissions: JSON.stringify(user.printBarcode_permissions || []),
    printTickets_permissions: JSON.stringify(user.printTickets_permissions || []),
    queueConfiguration_permissions: JSON.stringify(user.queueConfiguration_permissions || []),
    redeem_permissions: JSON.stringify(user.redeem_permissions || []),
    refund_permissions: JSON.stringify(user.refund_permissions || []),
    reviewTickets_permissions: JSON.stringify(user.reviewTickets_permissions || []),
    seatedView_permissions: JSON.stringify(user.seatedView_permissions || []),
    settle_permissions: JSON.stringify(user.settle_permissions || []),
    techops_permissions: JSON.stringify(user.techops_permissions || []),
    unprint_permissions: JSON.stringify(user.unprint_permissions || []),
    unprintTickets_permissions: JSON.stringify(user.unprintTickets_permissions || []),
    unredeem_permissions: JSON.stringify(user.unredeem_permissions || []),
    viewBuyerDetails_permissions: JSON.stringify(user.viewBuyerDetails_permissions || []),
    viewFollowStats_permissions: JSON.stringify(user.viewFollowStats_permissions || []),
    viewLogistics_permissions: JSON.stringify(user.viewLogistics_permissions || []),
    viewSales_permissions: JSON.stringify(user.viewSales_permissions || []),
    timestamp_added: user.timestamp_added || "",
    acl_role_id: user.acl_role_id || '',
    is_active: user.is_active || '',
    }));

   
    const csv = parse(csvData, { fields: csvFields });

   
    fs.writeFileSync(outputFilePath, csv);
    console.log(`CSV file saved to: ${outputFilePath}`);
  } catch (error) {
    console.error('Error processing JSON:', error);
  }
};


processJson();

    
  