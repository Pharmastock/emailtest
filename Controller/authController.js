
// const User = require('../Model/UserModel');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');
// const moment = require('moment');
// const multer = require('multer');
// const path = require('path');


// // Configure Multer storage and file filtering
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/profilePics'); // Ensure this directory exists
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
//     }
// });

// const fileFilter = (req, file, cb) => {
//     const fileTypes = /jpeg|jpg|png/;
//     const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = fileTypes.test(file.mimetype);

//     if (mimetype && extname) {
//         cb(null, true);
//     } else {
//         cb(new Error('Only .jpg, .jpeg, and .png image formats are allowed!'), false);
//     }
// };

// // Initialize Multer with file size and filter
// const upload = multer({
//     storage,
//     limits: { fileSize: 20 * 1024 * 1024 }, // Limit to 20 MB
//     fileFilter
// }).single('profilePic');

// // Helper function to encrypt SMTP password
// function encryptPassword(plainPassword) {
//     const algorithm = 'aes-256-cbc';
//     const encryptionKey = process.env.ENCRYPTION_KEY;

//     if (!encryptionKey || encryptionKey.length !== 64) {
//         throw new Error('Invalid encryption key: Ensure ENCRYPTION_KEY is defined as a 64-character hex string');
//     }

//     const key = Buffer.from(encryptionKey, 'hex');
//     const iv = crypto.randomBytes(16); // Initialization vector

//     const cipher = crypto.createCipheriv(algorithm, key, iv);
//     let encrypted = cipher.update(plainPassword, 'utf8', 'hex');
//     encrypted += cipher.final('hex');

//     return `${iv.toString('hex')}:${encrypted}`;
// }

// exports.register = async (req, res) => {

//     const { email, password, dob, backupEmail, state, city, country, pincode, firstname, secoundname } = req.body;
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//         return res.status(400).json({ error: 'Email is already registered. Please use a different email.' });
//     }


//     // Basic validations
//     if (!email || !password || !dob || !state || !city || !country || !pincode) {
//         return res.status(400).json({ error: 'All required fields must be filled.' });
//     }

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//         return res.status(400).json({ error: 'Invalid email format.' });
//     }

//     if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
//         return res.status(400).json({
//             error: 'Password must be at least 8 characters long, contain at least one uppercase letter, and one number.'
//         });
//     }

//     const pincodeRegex = /^[1-9][0-9]{5}$/;
//     if (!pincodeRegex.test(pincode)) {
//         return res.status(400).json({ error: 'Invalid pincode format. Must be a 6-digit number.' });
//     }

//     const formattedDOB = moment(dob, 'YYYY-MM-DD', true);
//     if (!formattedDOB.isValid()) {
//         return res.status(400).json({ error: 'Invalid date format for DOB. Please use YYYY-MM-DD.' });
//     }


//     // console.log({ email, password, dob, backupEmail, state, city, country, pincode, firstname, secoundname } = req.body)

//     upload(req, res, async (err) => {
//         if (err instanceof multer.MulterError) {
//             return res.status(400).json({ error: err.message });
//         } else if (err) {
//             return res.status(400).json({ error: err.message });
//         }



//         try {

//             const encryptedSMTPPassword = encryptPassword(password);

//             const hashedPassword = await bcrypt.hash(password, 10);

//             const profilePicPath = req.file ? req.file.path : 'uploads/profilePics/default.jpg';

//             const user = new User({
//                 email,
//                 password: hashedPassword,
//                 hashedSmtpPassword: encryptedSMTPPassword,
//                 dob: formattedDOB.toISOString(),
//                 backupEmail,
//                 state,
//                 city,
//                 country,
//                 pincode,
//                 profilePic: profilePicPath,
//                 firstname,
//                 secoundname
//             });

//             await user.save();
//             res.status(201).json({ message: 'User registered successfully.' });
//         } catch (error) {
//             console.error('Error registering user:', error);
//             res.status(500).json({ error: 'Server error. Please try again later.' });
//         }
//     });
// };



// exports.login = async (req, res) => {
//        const { email, password } = req.body;

//     console.log('Login attempt:', { email, password });

//     // Check for empty email or password
//     if (!email || !password) {
//         return res.status(400).json({ error: 'Email and password are required' });
//     }

//     try {
//         // Find user by email
//         const user = await User.findOne({ email });

//         if (!user) {
//             console.log('User not found for email:', email);
//             return res.status(404).json({ error: 'User not found' });
//         }

//         console.log('Stored hashed password from database:', user.password);

//         // Ensure that the stored password is a valid bcrypt hash (not plain text)
//         if (!user.password || user.password.length < 20) { // typical bcrypt hashes are over 50 characters
//             console.log('Password hash is missing or appears invalid.');
//             return res.status(500).json({ error: 'Server error. Please try again later.' });
//         }

//         // Check if the password matches
//         const isMatch = await bcrypt.compare(password, user.password);

//         if (!isMatch) {
//             console.log('Password mismatch for user:', email);
//             return res.status(400).json({ error: 'Invalid credentials' });
//         }

//         // Verify JWT Secret exists
//         if (!process.env.JWT_SECRET) {
//             console.log('JWT_SECRET is not defined in environment variables.');
//             return res.status(500).json({ error: 'Server configuration error.' });
//         }

//         // Generate JWT token with user ID and email in the payload
//         const token = jwt.sign(
//             { id: user._id, email: user.email },
//             process.env.JWT_SECRET,
//             { expiresIn: '1d' }
//         );

//         res.status(200).json({
//             message: 'Login successful',
//             token: `Bearer ${token}`,
//             user: {
//                 id: user._id,
//                 email: user.email,
//                 name: user.name, // Include other fields if needed
//             },
//         });
//     } catch (error) {
//         console.error('Error logging in:', error);
//         res.status(500).json({ error: 'Server error. Please try again later.' });
//     }
// };


const User = require('../Model/UserModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// // Configure Multer storage and file filtering
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/profilePics'); // Ensure this directory exists
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
//     }
// });

// const fileFilter = (req, file, cb) => {
//     const fileTypes = /jpeg|jpg|png/;
//     const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = fileTypes.test(file.mimetype);

//     if (mimetype && extname) {
//         cb(null, true);
//     } else {
//         cb(new Error('Only .jpg, .jpeg, and .png image formats are allowed!'), false);
//     }
// };

// const upload = multer({
//     storage,
//     limits: { fileSize: 20 * 1024 * 1024 }, // Limit to 20 MB
//     fileFilter
// }).single('profilePic');

// // Helper function to encrypt SMTP password
// function encryptPassword(plainPassword) {
//     const algorithm = 'aes-256-cbc';
//     const encryptionKey = process.env.ENCRYPTION_KEY;

//     if (!encryptionKey || encryptionKey.length !== 64) {
//         throw new Error('Invalid encryption key: Ensure ENCRYPTION_KEY is defined as a 64-character hex string');
//     }

//     const key = Buffer.from(encryptionKey, 'hex');
//     const iv = crypto.randomBytes(16); // Initialization vector

//     const cipher = crypto.createCipheriv(algorithm, key, iv);
//     let encrypted = cipher.update(plainPassword, 'utf8', 'hex');
//     encrypted += cipher.final('hex');

//     return `${iv.toString('hex')}:${encrypted}`;
// }

// exports.register = async (req, res) => {
//     upload(req, res, async (err) => {
//         const deleteFile = (filePath) => {
//             fs.unlink(filePath, (error) => {
//                 if (error) console.error('Error deleting file:', error);
//             });
//         };

//         if (err instanceof multer.MulterError || err) {
//             if (req.file) deleteFile(req.file.path); // Delete uploaded file if error occurs
//             return res.status(400).json({ error: err.message });
//         }

//         // Get fields from form-data after multer has processed
//         const { email, password, dob, backupEmail, state, city, country, pincode, firstname, secoundname } = req.body;

//         // Validate required fields
//         if (!email || !password || !dob || !state || !city || !country || !pincode || !firstname || !secoundname) {
//             if (req.file) deleteFile(req.file.path);
//             return res.status(400).json({ error: 'All required fields must be filled.' });
//         }

//         try {
//             // Check if email already exists
//             const existingUser = await User.findOne({ email });
//             if (existingUser) {
//                 if (req.file) deleteFile(req.file.path);
//                 return res.status(400).json({ error: 'Email is already registered. Please use a different email.' });
//             }

//             // Email format validation
//             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             if (!emailRegex.test(email)) {
//                 if (req.file) deleteFile(req.file.path);
//                 return res.status(400).json({ error: 'Invalid email format.' });
//             }

//             // Password strength validation
//             if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
//                 if (req.file) deleteFile(req.file.path);
//                 return res.status(400).json({
//                     error: 'Password must be at least 8 characters long, contain at least one uppercase letter, and one number.'
//                 });
//             }

//             // Pincode validation
//             const pincodeRegex = /^[1-9][0-9]{5}$/;
//             if (!pincodeRegex.test(pincode)) {
//                 if (req.file) deleteFile(req.file.path);
//                 return res.status(400).json({ error: 'Invalid pincode format. Must be a 6-digit number.' });
//             }

//             // DOB format validation
//             const formattedDOB = moment(dob, 'YYYY-MM-DD', true);
//             if (!formattedDOB.isValid()) {
//                 if (req.file) deleteFile(req.file.path);
//                 return res.status(400).json({ error: 'Invalid date format for DOB. Please use YYYY-MM-DD.' });
//             }

//             const encryptedSMTPPassword = encryptPassword(password);
//             const profilePicPath = req.file ? req.file.path : 'uploads/profilePics/default.jpg';
//             const hashedPassword = await bcrypt.hash(password, 10);

//             const user = new User({
//                 email,
//                 password: hashedPassword,
//                 hashedSmtpPassword: encryptedSMTPPassword,
//                 dob: formattedDOB.toISOString(),
//                 backupEmail,
//                 state,
//                 city,
//                 country,
//                 pincode,
//                 profilePic: profilePicPath,
//                 firstname,
//                 secoundname
//             });

//             await user.save();
//             res.status(201).json({ message: 'User registered successfully.' });
//         } catch (error) {
//             console.error('Error registering user:', error);
//             if (req.file) deleteFile(req.file.path);
//             res.status(500).json({ error: 'Server error. Please try again later.' });
//         }
//     });
// };
// Configure Multer storage and file filtering
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profilePics'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Save only the file name, not the full path
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only .jpg, .jpeg, and .png image formats are allowed!'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // Limit to 20 MB
    fileFilter
}).single('profilePic');

// Helper function to encrypt SMTP password
function encryptPassword(plainPassword) {
    const algorithm = 'aes-256-cbc';
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey || encryptionKey.length !== 64) {
        throw new Error('Invalid encryption key: Ensure ENCRYPTION_KEY is defined as a 64-character hex string');
    }

    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(16); // Initialization vector

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(plainPassword, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
}

exports.register = async (req, res) => {
    upload(req, res, async (err) => {
        const deleteFile = (filePath) => {
            fs.unlink(filePath, (error) => {
                if (error) console.error('Error deleting file:', error);
            });
        };

        if (err instanceof multer.MulterError || err) {
            if (req.file) deleteFile(req.file.path); // Delete uploaded file if error occurs
            return res.status(400).json({ error: err.message });
        }

        // Get fields from form-data after multer has processed
        const { email, password, dob, backupEmail, mobilenumber, state, city, country, pincode, firstname, secoundname } = req.body;

        // Validate required fields
        if (!email || !password || !dob || !state || !city || !country || !pincode || !firstname || !mobilenumber || !secoundname) {
            if (req.file) deleteFile(req.file.path);
            return res.status(400).json({ error: 'All required fields must be filled.' });
        }

        try {
            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                if (req.file) deleteFile(req.file.path);
                return res.status(400).json({ error: 'Email is already registered. Please use a different email.' });
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (req.file) deleteFile(req.file.path);
                return res.status(400).json({ error: 'Invalid email format.' });
            }

            // Password strength validation
            if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
                if (req.file) deleteFile(req.file.path);
                return res.status(400).json({
                    error: 'Password must be at least 8 characters long, contain at least one uppercase letter, and one number.'
                });
            }

            // Pincode validation
            const pincodeRegex = /^[1-9][0-9]{5}$/;
            if (!pincodeRegex.test(pincode)) {
                if (req.file) deleteFile(req.file.path);
                return res.status(400).json({ error: 'Invalid pincode format. Must be a 6-digit number.' });
            }

            // DOB format validation using Moment.js
            const formattedDOB = moment(dob, 'YYYY-MM-DD', true);  // Ensuring the format is valid
            if (!formattedDOB.isValid()) {
                if (req.file) deleteFile(req.file.path);
                return res.status(400).json({ error: 'Invalid date format for DOB. Please use YYYY-MM-DD.' });
            }

            const mobileRegex = /^[7-9][0-9]{9}$/;
            if (!mobileRegex.test(mobilenumber)) {
                if (req.file) deleteFile(req.file.path);
                return res.status(400).json({ error: 'Invalid mobilenumber format. Must be a 10-digit number.' });
            }
            // Store DOB as a string exactly as it was entered (YYYY-MM-DD)
            const dobString = formattedDOB.format('YYYY-MM-DD'); // Ensure it is saved as string without time part

            // Encrypt SMTP password
            const encryptedSMTPPassword = encryptPassword(password);

            // Save only the file name in the database (not the full path)
            const profilePicPath = req.file ? req.file.filename : ''; // If no file uploaded, set default image

            // Hash the user password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user
            const user = new User({
                email,
                password: hashedPassword,
                hashedSmtpPassword: encryptedSMTPPassword,
                dob: dobString,
                backupEmail,
                state,
                city,
                mobilenumber,
                country,
                pincode,
                profilePic: profilePicPath, // Save only the filename
                firstname,
                secoundname
            });

            await user.save();
            res.status(201).json({ message: 'User registered successfully.' });
        } catch (error) {
            console.error('Error registering user:', error);
            if (req.file) deleteFile(req.file.path);  // Delete the file if error occurs
            res.status(500).json({ error: 'Server error. Please try again later.' });
        }
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found for email:', email);
            return res.status(404).json({ error: 'User not found' });
        }

        // Check password hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Ensure JWT_SECRET exists
        if (!process.env.JWT_SECRET) {
            console.log('JWT_SECRET is not defined in environment variables.');
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        // Generate JWT token with user ID and email in the payload
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token: `Bearer ${token}`,
            user: {
                id: user._id,
                email: user.email,
                firstname: user.firstname,
                secoundname: user.secoundname,
            },
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};
