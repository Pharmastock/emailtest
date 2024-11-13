const Email = require("../Model/EmailModel");

// Get Emails by Folder
exports.getEmailsByFolder = async (req, res) => {
    const { folder } = req.params;

    if (!['inbox', 'sent', 'draft', 'trash', 'archived'].includes(folder)) {
        return res.status(400).json({ error: 'Invalid folder' });
    }

    try {
        const emails = await Email.find({ folder, user_id: req.userId });
      
        res.json(emails);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve emails' });
    }
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
