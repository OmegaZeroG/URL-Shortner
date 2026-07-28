const Redis = require('ioredis');
require('dotenv').config();

// Single shared Redis client (Upstash, standard Redis protocol over TLS).
// Errors are logged, not thrown at startup — if Redis is down we want
// redirects to still work by falling back to Postgres, not crash the app.
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

module.exports = redis;
