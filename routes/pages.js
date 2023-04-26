const express = require("express");
const router = express.Router();
const mysql = require("mysql");

//import database
//import database
const db = mysql.createConnection({
    multipleStatements: true,
    host: "ls-b5a7c2d0523ed96d796d06f76a9bca04dd878354.colruabkptpb.us-east-1.rds.amazonaws.com",
    user: "dbmasterprint",
    password: "Sasuke317",
    database: "dbmaster"
});

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/index', (req, res) => {
    res.render('index');
});


router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/UserDashboard', (req, res) => {
    res.render('UserDashboard');
});

router.get('/settings', (req, res) => {
    res.render('settings');
});


//res.render('UserDashboard', {"data":results[0], "myData":results[1]});
router.get('/UserProfile', (req, res) => {
    var sql = "SELECT * from User WHERE Username = ?;SELECT PrinterName, Port, IPVersion FROM UserPrinter JOIN User ON (User.UserID = UserPrinter.User_UserID) JOIN Printer ON (Printer.PrinterID = UserPrinter.Printer_PrinterID) WHERE Username = ?";
    var query = db.query(sql, [localStorage.getItem('username'), localStorage.getItem('username')], function(err, result) {
        res.render('UserProfile', {"result": result[0], "results": result[1]});
    })
});

router.get('/EditProfile', (req, res) => {
    var sql = "SELECT * from User WHERE Username =?";
    var query = db.query(sql, [localStorage.getItem('username')], function (err, result) {
        res.render('EditProfile', {"result": result});
    })
});

router.get('/Connected-Printers', (req, res) => {
    var sql = "SELECT * from User WHERE Username = ?;SELECT PrinterName, Date_Joined FROM UserPrinter JOIN User ON (User.UserID = UserPrinter.User_UserID) JOIN Printer ON (Printer.PrinterID = UserPrinter.Printer_PrinterID) WHERE Username = ?";
    var query = db.query(sql, [localStorage.getItem('username'), localStorage.getItem('username')], function(err, result) {
        res.render('Connected-Printers', {"result": result[0], "results": result[1]});
    })
});

router.get('/Networked-Printers', (req, res) => {
    var sql = "SELECT * from User WHERE Username = ?; SELECT * from Printer";
    var quet = db.query(sql, [localStorage.getItem('username')], function(err, result) {
        res.render('Networked-Printers', {"result": result[0], "results": result[1]});
    })
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/AdminLogin', (req, res) => {
    res.render('AdminLogin');
})

router.get('/Admin_Home', (req, res) => {
    res.render('Admin_Home');
});

router.get('/checkout', (req, res) => {
    res.render('checkout');
});

router.get('/editPrinterProfile', (req, res) => {
    res.render('editPrinterProfile');
});

router.get('/forgot-password-2', (req, res) => {
    res.render('forgot-password-2');
});

router.get('/group-list', (req, res) => {
    res.render('group-list');
});

router.get('/Intro-1', (req, res) => {
    res.render('Intro-1');
});

router.get('/invoice-1', (req, res) => {
    res.render('invoice-1');
});

router.get('/invoice-add', (req, res) => {
    res.render('invoice-add');
});

router.get('/invoice-edit', (req, res) => {
    res.render('invoice-edit');
});

router.get('/network-analytics', (req, res) => {
    res.render('network-analytics');
});

router.get('/Plans-Intro', (req, res) => {
    res.render('Plans-Intro');
});

router.get('/Plans', (req, res) => {
    res.render('Plans');
});

router.get('/PrinterProfile', (req, res) => {
    res.render('PrinterProfile');
});

router.get('/users-list-1', (req, res) => {
    res.render('users-list-1');
});

router.get('/users-list-1', (req, res) => {
    res.render('users-list-1');
});

router.get('/Home', (req, res) => {
    res.render('Home');
});

router.get('/Hotel', (req, res) => {
    res.render('Hotel');
});

/*
const express = require("express");
const router = express.Router();

router.get('/UserProfile', (req, res) => {
    var sql = "SELECT Username from User WHERE Username 'ssslll'";
    var query = db.query(sql, function(err, result) {
        console.log(result);
        res.render('UserProfile', {"result": result});
    })
});
*/


// export pages to defined routes
module.exports = router;