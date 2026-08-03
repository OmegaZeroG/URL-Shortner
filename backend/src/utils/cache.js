const redis = require('../config/redis');

// Cache-aside pattern for the redirect lookup (see DESIGN.md section 8):
// redirectUrl checks Redis first, falls through to Postgres on a miss, then
// populates Redis for next time. This is the single most impactful thing
// for redirect latency at scale — see ../../loadtest/ for measured numbers.
//
// Default TTL caps how long a link can serve stale data if it's edited or
// deleted directly in the DB. If the link has an explicit expiresAt sooner
// than the default TTL, we cap the cache entry to that instead — so Redis
// naturally evicts it at (or before) the moment the link should stop working.
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

function cacheKey(code) {
  return `link:${code}`;
}

// Returns { longUrl, linkId } or null. linkId is cached alongside longUrl
// so click-event logging (see clickEvents.js) doesn't need a second DB
// round-trip just to resolve short_code -> id on every cache-hit redirect.
async function getCachedLink(code) {
  try {
    const cached = await redis.get(cacheKey(code));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return { longUrl: parsed.longUrl, linkId: parsed.linkId };
  } catch (err) {
    console.error('Redis GET failed, falling back to DB:', err.message);
    return null;
  }
}

async function cacheLink(code, { longUrl, linkId }, expiresAt) {
  try {
    let ttl = DEFAULT_TTL_SECONDS;
    if (expiresAt) {
      const secondsUntilExpiry = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000
      );
      // Never cache an already-expired or negative TTL; cap to the default.
      ttl = Math.max(1, Math.min(DEFAULT_TTL_SECONDS, secondsUntilExpiry));
    }
    await redis.set(cacheKey(code), JSON.stringify({ longUrl, linkId }), 'EX', ttl);
  } catch (err) {
    // Cache writes are best-effort — never let a Redis failure break the
    // redirect that already succeeded against Postgres.
    console.error('Redis SET failed (non-fatal):', err.message);
  }
}

module.exports = { getCachedLink, cacheLink };
