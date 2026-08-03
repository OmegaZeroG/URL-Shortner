const express = require('express');
const { signup, login } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/api/auth/signup', authLimiter, signup);
router.post('/api/auth/login', authLimiter, login);

module.exports = router;
