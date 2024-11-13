const express = require('express');
const router = express.Router();
const { deleteSingleEmail, deleteMultipleEmails, restoreSingleEmail, restoreMultipleEmails, permanentDeleteSingleEmail, permanentDeleteMultipleEmails
} = require('../Controller/moveToTrashController');
const authenticateToken = require('../MiddleWare/AuthAuthorization'); // Adjust the path if needed


// Route to delete a single email
router.delete('/emailtotrash/:emailId', authenticateToken, deleteSingleEmail);

// Route to delete multiple emails
router.delete('/emailtotrash', authenticateToken, deleteMultipleEmails);


// Restore email routes from trash
router.patch('/email/restore/:emailId', authenticateToken, restoreSingleEmail); // Restore single email
router.patch('/emails/restore', authenticateToken, restoreMultipleEmails);      // Restore multiple emails

// Permanent delete email routes for permenent delete
router.delete('/email/permanent/:emailId', authenticateToken, permanentDeleteSingleEmail); // Permanently delete single email in trash
router.delete('/emails/permanent', authenticateToken, permanentDeleteMultipleEmails);      // Permanently delete multiple emails in trash




module.exports = router;