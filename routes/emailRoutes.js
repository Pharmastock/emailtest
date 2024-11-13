const express = require('express');
const router = express.Router();
const Mail = require('../Controller/composeMail');
const authenticateToken = require('../MiddleWare/AuthAuthorization'); // Adjust the path if needed
const { getEmailsByFolder, toggleStarred, toggleConversation, getAllStarredEmails, getAllConversations } = require('../Controller/getallmail');


// Toggle Starred Status
router.put('/:id/starred', authenticateToken, toggleStarred);

// Toggle Conversation Status
router.put('/:id/conversation', authenticateToken, toggleConversation);

// Get All Starred Emails
router.get('/starred', authenticateToken, getAllStarredEmails);

// Get All Conversations
router.get('/conversations', authenticateToken, getAllConversations);

//send mail
router.get('/mails/:folder', authenticateToken, getEmailsByFolder );


//send mail
router.post('/sendmail', authenticateToken, Mail.sendEmail);

// //login router for login email with token
// router.post('/loginmail', Users.login);

module.exports = router;
