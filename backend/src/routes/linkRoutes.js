const express = require('express');
const { shortenUrl, redirectUrl } = require('../controllers/linkController');

const router = express.Router();

router.post('/api/shorten', shortenUrl);
router.get('/:code', redirectUrl);

module.exports = router;
