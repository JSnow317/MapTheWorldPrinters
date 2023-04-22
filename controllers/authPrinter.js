
//const fs = require('fs');
//const ipp = require('ipp');
//const dnssd = require('dnssd'); 

function printJob() {
// need these from HotelUser Table
let pdf = '';
let domain = '';
let username = '';
let jobname = '';

fs.readFile(pdf, function(err, data) { 
if (err)
    throw err;

let printer = ipp.Printer(domain);
let msg = {
    "operation-attributes-tag": {
    "requesting-user-name": username,
    "job-name": jobname,
    "document-format": "application/pdf"
    },
    data: data
};
printer.execute("Print-Job", msg, function(err, res){
    console.log(res);
});
});
}

function findPrinters(){

const browser = dnssd.Browser(dnssd.tcp('printer'))
  .on('serviceUp', service => {
      con.connect(function(err) {
          if (err) throw err;
          let sql = `INSERT INTO dbmaster.Printer (PrinterID, AdminID, PrinterName, ErrorID, JobID, SerialKey, IPAddress, IPVersion, Interface, Port, Make, Model, Domain) VALUES (null, 1, ${service.name}, 1, 1, ${service.txt.UUID}, ${service.addresses[0]}, 'IPv4', 'IPP', ${service.port}, ${service.usb_MFG}, ${service.usb_MDL}, ${service.domain})`;
          con.query(sql, function (err, result) {
              if (err) throw err;
          });
      });
  })
.start();
} 