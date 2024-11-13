const express = require('express');
const router = express.Router();
const ReplyMail = require('../Controller/replayController');
const authenticateToken = require('../MiddleWare/AuthAuthorization'); // Adjust the path if needed


//send mail
router.post('/sendmail', authenticateToken, ReplyMail.replyEmail);

// //login router for login email with token
// router.post('/loginmail', Users.login);

module.exports = router;
