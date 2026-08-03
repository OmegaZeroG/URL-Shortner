const express = require('express');
const {
  shortenUrl,
  redirectUrl,
  getMyLinks,
  getLinkAnalytics,
  deleteLink,
} = require('../controllers/linkController');
const { shortenLimiter } = require('../middleware/rateLimiter');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// optionalAuth: anonymous shortening still works, but if a valid token is
// present the link gets attributed to that user (see linkController.js).
router.post('/api/shorten', optionalAuth, shortenLimiter, shortenUrl);

// All of these require a logged-in user — there's no "anonymous" version.
router.get('/api/links', requireAuth, getMyLinks);
router.get('/api/links/:code/analytics', requireAuth, getLinkAnalytics);
router.delete('/api/links/:code', requireAuth, deleteLink);

// Must stay last: this catches any other single-segment path as a short
// code, so it would otherwise shadow more specific routes defined after it.
router.get('/:code', redirectUrl);

module.exports = router;
