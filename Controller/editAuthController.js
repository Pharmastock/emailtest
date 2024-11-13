const User = require('../Model/UserModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure Multer storage and file filtering for profile picture
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profilePics'); // Save files in 'uploads/profilePics' directory
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9); // Unique file name
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`); // Save with original file extension
    }
});

// Set up file filter to allow only certain types of images
function fileFilter(req, file, cb) {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Only .jpg, .jpeg, and .png image formats are allowed!'), false); // Reject file
    }
}

// Create multer upload middleware with size limit (20MB) and file filter
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB file size limit
    fileFilter
}).single('profilePic'); // Expect 'profilePic' field in the form

//Change profile picture
exports.changeProfilePic = async (req, res) => {
    upload(req, res, async (err) => {
        // Handle Multer-specific errors
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const userId = req.userId; // Get user ID from request
        console.log('User ID:', userId);

        try {
            const user = await User.findOne({ _id: userId }); // Find user by ID
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            // If a new file is uploaded, delete the old profile picture if it exists
            if (req.file) {
                // Delete the old profile picture from the server if it exists
                if (user.profilePic && fs.existsSync(path.join('uploads', 'profilePics', user.profilePic))) {
                    fs.unlinkSync(path.join('uploads', 'profilePics', user.profilePic)); // Remove old file
                }

                // Store only the file name in the database
                user.profilePic = req.file.filename; // Save only the file name
            } else {
                return res.status(400).json({ error: 'No file uploaded. Please upload a valid image.' });
            }

            // Save updated user data to the database
            await user.save();
            res.status(200).json({ message: 'Profile picture updated successfully.' });
        } catch (error) {
            console.error('Error updating profile picture:', error);
            res.status(500).json({ error: 'Server error. Please try again later.' });
        }
    });
};

// Edit User Function (excluding profile picture)
exports.editUser = async (req, res) => {
    const userId = req.userId;

    const { email } = req.params; // Assume user ID is passed in the route
    const { dob, backupEmail, state, city, country, mobilenumber, pincode } = req.body;
    // console.log(userId, email)
    // console.log({ dob, backupEmail, state, city, country, pincode })
    // Basic validations
    if (!dob || !state || !city || !country || !mobilenumber || !pincode) {
        return res.status(400).json({ error: 'All required fields must be filled.' });
    }

    // Email validation
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        return res.status(400).json({ error: 'Please send proper email.' });
    }

    // Pincode validation
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(pincode)) {
        return res.status(400).json({ error: 'Invalid pincode format. Must be a 6-digit number.' });
    }

    // Date of Birth validation and formatting
    const formattedDOB = moment(dob, 'YYYY-MM-DD', true);
    if (!formattedDOB.isValid()) {
        return res.status(400).json({ error: 'Invalid date format for DOB. Please use YYYY-MM-DD.' });
    }

    const mobileRegex = /^[7-9][0-9]{9}$/;
    if (!mobileRegex.test(mobilenumber)) {
        return res.status(400).json({ error: 'Invalid mobilenumber format. Must be a 10-digit number.' });
    }
    try {
        const user = await User.findOne({ _id: userId, email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Update user details
        user.dob = formattedDOB.toISOString();
        user.backupEmail = backupEmail;
        user.state = state;
        user.city = city;
        user.mobilenumber = mobilenumber;
        user.country = country;
        user.pincode = pincode;

        await user.save();
        res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

//delete profile-pic
exports.deleteProfilePic = async (req, res) => {
    try {
        // Get the userId from the request (authenticated user)
        const userId = req.userId;
        const { email } = req.params;

        // Find the user by ID
        const user = await User.findOne({ _id: userId, email });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // If the user doesn't have a profile picture, no need to delete anything
        if (!user.profilePic) {
            return res.status(400).json({ error: 'No profile picture to delete.' });
        }

        // Construct the full path to the profile picture file
        const filePath = path.join(__dirname, '..', 'uploads', 'profilePics', user.profilePic);

        // Check if the file exists
        if (fs.existsSync(filePath)) {
            // Delete the file
            fs.unlinkSync(filePath);

            // Update the user's profile picture in the database (set it to null or a default image)
            user.profilePic = ''; // Or you can use 'default.jpg' or any fallback image
            await user.save();

            return res.status(200).json({ message: 'Profile picture deleted successfully.' });
        } else {
            return res.status(400).json({ error: 'Profile picture file does not exist.' });
        }

    } catch (error) {
        console.error('Error deleting profile picture file:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

//user data get
exports.userData = async (req, res) => {
    try {
        const { email } = req.params;
        // Find the user by the ID attached to the request by the middleware
        const user = await User.findOne({ _id: req.userId, email }).select('-password -hashedSmtpPassword'); // Exclude sensitive fields

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Construct profile picture URL if it exists and the file exists on the server
        let profilePicUrl = null;
        if (user.profilePic) {
            // Construct the path to the profile picture file
            const profilePicPath = path.join('uploads', 'profilePics', user.profilePic);

            // Check if the file exists
            if (fs.existsSync(profilePicPath)) {
                // If file exists, construct the URL to access the image
                profilePicUrl = `${req.protocol}://${req.get('host')}/${user.profilePic}`;
            } else {
                // If file doesn't exist, set profilePicUrl to a default image
                profilePicUrl = `${req.protocol}://${req.get('host')}/uploads/profilePics/default-profile.png`;
            }
        }

        // Send user data including profile picture path
        res.status(200).json({
            firstname: user.firstname,
            secoundname: user.secoundname,
            email: user.email,
            dob: user.dob,
            backupEmail: user.backupEmail,
            state: user.state,
            city: user.city,
            country: user.country,
            pincode: user.pincode,
            // profilePic: profilePicUrl, // Return the profile picture URL
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};
//get profile-pic 
exports.getProfilePic = async (req, res) => {
    const userId = req.userId; // Get userId from the URL parameter
    const { email } = req.params;

    try {
        const user = await User.findOne({ _id: userId, email }); // Find the user by ID
        if (!user) {
            return res.status(404).json({ error: 'User not found.' }); // If user doesn't exist
        }

        // Get the profile picture file name stored in the database
        const profilePicFileName = user.profilePic;

        if (!profilePicFileName) {
            return res.status(404).json({ error: 'Profile picture not found for this user.' });
        }

        // Construct the file path to the profile picture
        const profilePicPath = path.join('uploads', 'profilePics', profilePicFileName);

        // Resolve the absolute file path
        const absolutePath = path.resolve(profilePicPath);

        // Check if the profile picture exists on the server
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'Profile picture file not found on the server.' });
        }

        // Serve the file if it exists
        res.sendFile(absolutePath); // Send the absolute file path to res.sendFile

    } catch (error) {
        console.error('Error fetching profile picture:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
}