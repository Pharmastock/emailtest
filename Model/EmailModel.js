const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: [{
        type: String,
        required: true
    }],
    cc: [{
        type: String,
    }],
    bcc: [{
        type: String,
    }],
    subject: {
        type: String,
        required: true
    },
    text: {
        type: String,
    },
    html: {
        type: String,
    },
    folder: {
        type: String,
        enum: ['inbox', 'sent', 'draft', 'trash', 'archived'],
        default: 'inbox'
    },
    starred: {
        type: Boolean,
        default: false,
        required: true
    },
    conversation: {
        type: Boolean,
        default: false,
        required: true
    },
    watched: {
        type: Boolean,
        default: false,
        required: true
    },
    attachments: [{
        filename: String,
        path: String,
    }],
    deletionDate: {
        type: Date,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    },
    inReplyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Email'
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('Email', EmailSchema);
