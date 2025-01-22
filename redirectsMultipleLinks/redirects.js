var csvjson = require('csvjson');
const fs = require('fs');
var options = {
    delimiter: ',', // optional
    quote: '"' // optional
};
var file_data = fs.readFileSync('input1.csv', { encoding: 'utf8' });
const csvData = csvjson.toObject(file_data, options);
//console.log(csvData)
for(let i =0;i<csvData.length;i++) {
    var slug1 = csvData[i].slug1;
    var slug2 = csvData[i].slug2;
    //var id = csvData[i].id;
    //var barcode = csvData[i].barcode;
    var ojb = '\n{'+
                '\n\t'+'"from": "/'+slug1+'/event",\n'+
                '\t"to": "/'+slug2+'/event"\n'
                +'},';
    //var ojb = "("+ id +",'"+ barcode + "','printed',"+ "0, 2018, NOW(), NOW(), 730),";
    // var ojb = "(488,"+id+",0,null,null,0,null,null,NOW(),NOW(),null),";
    console.log(ojb);
    fs.appendFile('new.txt', ojb, function (err) {
         if (err) throw err;
         //console.log('Saved!');
     });
}