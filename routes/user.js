const express = require('express');
const router = express.Router();

// importing auth controllers
const { read, update } = require("../controllers/user");

// importing validators
const { requireSignin, adminMiddleware } = require('../controllers/auth');

router.get('/user/:id', requireSignin, read);
router.put('/user/update', requireSignin, update);
router.put('/admin/update', requireSignin, adminMiddleware, update);

module.exports = router;