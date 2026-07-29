const express = require('express');
const { shortenUrl, redirectUrl } = require('../controllers/linkController');
const { shortenLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/api/shorten', shortenLimiter, shortenUrl);
router.get('/:code', redirectUrl);

module.exports = router;
