const Email = require('../Model/EmailModel');

//this is add in inbox
// Delete a single email for a specific user move to trash
exports.deleteSingleEmail = async (req, res) => {
    const { emailId } = req.params;
    const { user_id } = req.userId; // Assume user_id is passed in the body for user verification

    try {
        const email = await Email.findOne({ _id: emailId, user_id });

        if (!email) {
            return res.status(404).json({ error: 'Email not found for this user.' });
        }

        email.folder = 'trash';
        email.deletationdate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Set deletion date to 30 days from now
        await email.save();

        res.status(200).json({ message: 'Email marked for deletion after 30 days.' });
    } catch (error) {
        console.error('Error marking email for deletion:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
    // demo code for body
    // {
    //     "user_id": "63e2bcf8d1b1c4e66a2cbbd5" // Replace with the user's ID
    // }
};

// Delete multiple emails for a specific user move to trash
exports.deleteMultipleEmails = async (req, res) => {
    const { emailIds } = req.body; // Expect emailIds array and user_id in the request body
    const { user_id } = req.userId;
    try {
        const result = await Email.updateMany(
            { _id: { $in: emailIds }, user_id },
            { $set: { folder: 'trash', deletationdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'No emails found for this user with the provided IDs.' });
        }

        res.status(200).json({ message: 'Emails marked for deletion after 30 days.' });
    } catch (error) {
        console.error('Error marking multiple emails for deletion:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
    // {
    //     "user_id": "63e2bcf8d1b1c4e66a2cbbd5", // Replace with the user's ID
    //     "emailIds": [
    //         "63e3b6e4aaf5ae12d7b4fdc3",
    //         "63e3b6e4aaf5ae12d7b4fdc4"
    //     ]
    // }
};



// this is add in thrsh 
// Restore a single email from trash to inbox
exports.restoreSingleEmail = async (req, res) => {
    const { emailId } = req.params;
    const { user_id } = req.userId;

    try {
        const email = await Email.findOne({ _id: emailId, user_id, folder: 'trash' });

        if (!email) {
            return res.status(404).json({ error: 'Email not found in trash for this user.' });
        }

        // Restore email to inbox and clear deletationdate
        email.folder = 'inbox';
        email.deletationdate = null;
        await email.save();

        res.status(200).json({ message: 'Email successfully restored to inbox.' });
    } catch (error) {
        console.error('Error restoring email:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Restore multiple emails from trash to inbox
exports.restoreMultipleEmails = async (req, res) => {
    const { emailIds } = req.body;
    const { user_id } = req.userId;
    try {
        const result = await Email.updateMany(
            { _id: { $in: emailIds }, user_id, folder: 'trash' },
            { $set: { folder: 'inbox', deletationdate: null } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'No emails found in trash for this user with the provided IDs.' });
        }

        res.status(200).json({ message: 'Emails successfully restored to inbox.' });
    } catch (error) {
        console.error('Error restoring multiple emails:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Permanently delete a single email from trash
exports.permanentDeleteSingleEmail = async (req, res) => {
    const { emailId } = req.params;
    const { user_id } = req.userId;

    try {
        const email = await Email.findOneAndDelete({ _id: emailId, user_id, folder: 'trash' });

        if (!email) {
            return res.status(404).json({ error: 'Email not found in trash for this user.' });
        }

        res.status(200).json({ message: 'Email permanently deleted from trash.' });
    } catch (error) {
        console.error('Error permanently deleting email:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Permanently delete multiple emails from trash
exports.permanentDeleteMultipleEmails = async (req, res) => {
    const { emailIds } = req.body;
    const { user_id } = req.userId;

    try {
        const result = await Email.deleteMany({ _id: { $in: emailIds }, user_id, folder: 'trash' });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'No emails found in trash for this user with the provided IDs.' });
        }

        res.status(200).json({ message: 'Emails permanently deleted from trash.' });
    } catch (error) {
        console.error('Error permanently deleting multiple emails:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};
