const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

// Redis-backed (not in-memory) so limits hold even if Render ever runs more
// than one instance — an in-memory counter would reset per instance and
// silently defeat the limit. Both limiters below get distinct `prefix`
// values so their Redis keys never collide with each other.
//
// Configurable via env so it can be temporarily raised for local load
// testing (see loadtest/README.md) without touching this file or ever
// risking the weaker value getting committed — RATE_LIMIT_MAX only exists
// in a local .env, which is gitignored. Defaults to the real production
// value (10) if the env var isn't set.
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 10;

// Applied to POST /api/shorten; the redirect path (GET /:code) stays
// unlimited since that's the read-heavy core of the service and is already
// protected by the Redis cache in front of it (see utils/cache.js).
const shortenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: MAX_REQUESTS, // 10 requests per IP per minute in production
  standardHeaders: true, // return RateLimit-* headers
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:shorten:',
  }),
});

// Applied to POST /api/auth/login and /api/auth/signup — much stricter,
// since these are the endpoints a brute-force or credential-stuffing
// attempt would actually target. There was previously no rate limiting on
// auth at all, meaning unlimited password guesses were possible.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:auth:',
  }),
});

module.exports = { shortenLimiter, authLimiter };
