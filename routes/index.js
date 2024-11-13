var express = require('express');
const authenticateToken = require('../MiddleWare/AuthAuthorization');
var router = express.Router();

/* GET home page. */
router.get('/', authenticateToken, function(req, res, next) {
  res.json({ message: 'Warning: Do not touch this endpoint! of avinix solutions.' }); 
});

module.exports = router;
