const Email = require("../Model/EmailModel");
const path = require('path');
const fs = require('fs');

// // Get Emails by Folder
// exports.getEmailsByFolder = async (req, res) => {
//     const { folder } = req.params;

//     if (!['inbox', 'sent', 'draft', 'trash', 'archived'].includes(folder)) {
//         return res.status(400).json({ error: 'Invalid folder' });
//     }

//     try {
//         const emails = await Email.find({ folder, user_id: req.userId });

//         res.json(emails);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to retrieve emails' });
//     }
// };
exports.getEmailsByFolder = async (req, res) => {
    const { folder } = req.params;

    // Validate the folder
    if (!['inbox', 'sent', 'draft', 'trash', 'archived'].includes(folder)) {
        return res.status(400).json({ error: 'Invalid folder' });
    }

    try {
        // Fetch emails from the database
        const emails = await Email.find({ folder, user_id: req.userId });

        // Add download and preview links to attachments
        const emailsWithLinks = emails.map(email => {
            const transformedEmail = email.toObject(); // Convert Mongoose document to plain JS object

            if (transformedEmail.attachments && transformedEmail.attachments.length > 0) {
                transformedEmail.attachments = transformedEmail.attachments.map(attachment => ({
                    ...attachment,
                    downloadLink: `${req.protocol}://${req.get('host')}/api/email/download/${path.basename(attachment.path)}`,
                    previewLink: `${req.protocol}://${req.get('host')}/api/email/preview/${path.basename(attachment.path)}`
                }));
            }
            return transformedEmail;
        });

        // Send the response
        res.json(emailsWithLinks);
    } catch (err) {
        console.error('Error retrieving emails:', err);
        res.status(500).json({ error: 'Failed to retrieve emails' });
    }
};

exports.previweFile = (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename); // Adjust the folder path if necessary

    fs.access(filePath, fs.constants.F_OK, err => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Set appropriate headers for the browser to handle the file type
        res.sendFile(filePath, err => {
            if (err) {
                res.status(500).json({ error: 'Failed to preview file' });
            }
        });
    });
};

exports.downloadfile = (req, res) => {
    const { filename } = req.params;
    console.log(filename)
    const filePath = path.join(__dirname, 'uploads', filename); // Adjust the folder path if necessary

    fs.access(filePath, fs.constants.F_OK, err => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, filename, err => {
            if (err) {
                res.status(500).json({ error: 'Failed to download file' });
            }
        });
    });
};



// 1. Toggle Starred Status
exports.toggleStarred = async (req, res) => {
    const { id } = req.params;

    try {
        const email = await Email.findOne({ _id: id, user_id: req.userId });
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        email.starred = !email.starred; // Toggle starred status
        await email.save();
        res.json({ message: `Email starred status set to ${email.starred}`, email });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle starred status' });
    }
};

// 2. Toggle Conversation Status
exports.toggleConversation = async (req, res) => {
    const { id } = req.params;

    try {
        const email = await Email.findOne({ _id: id, user_id: req.userId });
        if (!email) {
            return res.status(404).json({ error: 'Email not found' });
        }

        email.conversation = !email.conversation; // Toggle conversation status
        await email.save();
        res.json({ message: `Email conversation status set to ${email.conversation}`, email });
    } catch (err) {
        res.status(500).json({ error: 'Failed to toggle conversation status' });
    }
};

// 3. Get All Starred Emails
exports.getAllStarredEmails = async (req, res) => {
    try {
        const starredEmails = await Email.find({ starred: true, user_id: req.userId });
        res.json(starredEmails);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve starred emails' });
    }
};

// 4. Get All Conversations
exports.getAllConversations = async (req, res) => {
    try {
        const conversations = await Email.find({ conversation: true, user_id: req.userId });
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve conversations' });
    }
};
