const express = require('express');
const { signup, login } = require('../controllers/authController');

const router = express.Router();

router.post('/api/auth/signup', signup);
router.post('/api/auth/login', login);

module.exports = router;
