// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    firstname: {
        type: String,
        required: true
    },
    secoundname: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    hashedSmtpPassword: {
        type: String,
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    mobilenumber: {
        type: Number,
        required: true
    },
    backupEmail: {
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    country: {
        type: String

    },
    pincode: {
        type: String
    },
    profilePic: {
        type: String
    }
});


module.exports = mongoose.model('User', UserSchema);
