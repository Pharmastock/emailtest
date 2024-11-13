const express = require('express');
const router = express.Router();
const Users = require('../Controller/authController');
const editUsers = require('../Controller/editAuthController');
const authenticateToken = require('../MiddleWare/AuthAuthorization'); // Adjust the path if needed


// register router for register email
router.post('/createmail', Users.register);

// login router for login email with token
router.post('/loginmail', Users.login);

// change profile pic 
router.put('/changeprofile/:email',authenticateToken, editUsers.changeProfilePic);

// user edit data 
router.put('/editdata/:email',authenticateToken, editUsers.editUser);

// delete profile pic 
router.delete('/deleteprofile/:email',authenticateToken, editUsers.deleteProfilePic);

// get profile data 
router.get('/profile/:email',authenticateToken, editUsers.userData);

// get profile data 
router.get('/profileimage/:email',authenticateToken, editUsers.getProfilePic);

module.exports = router;
