const express = require("express");
const authController = require('./controllers/auth');
const router = express.Router();

router.post('/auth', authController.register);
router.post('/loginAuth', authController.login);
router.post('/UserDashboardRefresh', authController.refresh);
router.post('/HotelSubmitFile', authController.hotelUser);


// export pages to defined routes
module.exports = router;