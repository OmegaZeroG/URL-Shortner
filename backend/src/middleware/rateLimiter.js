const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

// Redis-backed (not in-memory) so the limit holds even if Render ever runs
// more than one instance — an in-memory counter would reset per instance
// and silently defeat the limit. Applied only to the write path
// (POST /api/shorten); the redirect path (GET /:code) stays unlimited since
// that's the read-heavy core of the service and is already protected by the
// Redis cache in front of it (see utils/cache.js).
const shortenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per IP per minute
  standardHeaders: true, // return RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});

module.exports = { shortenLimiter };
