const pool = require('../config/db');
const { encode } = require('../utils/base62');
const { nextSnowflakeId } = require('../utils/snowflake');
const { getCachedLink, cacheLink } = require('../utils/cache');
const { recordClickEvent } = require('../utils/clickEvents');
const { captureError } = require('../instrument');

const CUSTOM_ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;
const VALID_ID_STRATEGIES = ['counter', 'snowflake'];

async function shortenUrl(req, res) {
  const { longUrl, customAlias, expiresAt, idStrategy = 'counter' } = req.body;

  if (!longUrl || typeof longUrl !== 'string') {
    return res.status(400).json({ error: 'longUrl is required' });
  }
  try {
    new URL(longUrl); // throws if not a valid absolute URL
  } catch {
    return res.status(400).json({ error: 'longUrl must be a valid absolute URL' });
  }

  if (customAlias && !CUSTOM_ALIAS_RE.test(customAlias)) {
    return res.status(400).json({
      error: 'customAlias must be 3-32 characters: letters, numbers, _ or -',
    });
  }

  if (!VALID_ID_STRATEGIES.includes(idStrategy)) {
    return res
      .status(400)
      .json({ error: `idStrategy must be one of: ${VALID_ID_STRATEGIES.join(', ')}` });
  }

  // req.user is set by the optionalAuth middleware when a valid Bearer token
  // is present, and left undefined otherwise — anonymous shortening is still
  // allowed (owner_id is nullable), it just won't show up under "My Links".
  const ownerId = req.user?.id || null;

  try {
    if (customAlias) {
      const existing = await pool.query(
        'SELECT id FROM links WHERE short_code = $1',
        [customAlias]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'customAlias is already taken' });
      }

      const insert = await pool.query(
        `INSERT INTO links (short_code, long_url, owner_id, expires_at)
         VALUES ($1, $2, $3, $4) RETURNING short_code, long_url, expires_at`,
        [customAlias, longUrl, ownerId, expiresAt || null]
      );
      return res.status(201).json(toResponse(insert.rows[0], req));
    }

    if (idStrategy === 'snowflake') {
      return await shortenWithSnowflake({ longUrl, ownerId, expiresAt, req, res });
    }

    // Default: counter + Base62 (see base62.js / DESIGN.md section 7). Insert
    // first to get the auto-increment id, then Base62-encode that id into
    // the short_code and update the row.
    const insert = await pool.query(
      `INSERT INTO links (short_code, long_url, owner_id, expires_at)
       VALUES ('', $1, $2, $3) RETURNING id, long_url, expires_at`,
      [longUrl, ownerId, expiresAt || null]
    );
    const shortCode = encode(insert.rows[0].id);
    const updated = await pool.query(
      `UPDATE links SET short_code = $1 WHERE id = $2
       RETURNING short_code, long_url, expires_at`,
      [shortCode, insert.rows[0].id]
    );
    return res.status(201).json(toResponse(updated.rows[0], req));
  } catch (err) {
    captureError(err);
    console.error('shortenUrl error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Snowflake path: the id is generated client-side, before the INSERT —
// unlike the counter path, which needs a DB round-trip first to get the
// next sequence value. That's exactly why Snowflake removes the
// shared-sequence bottleneck: no round-trip to a central counter is needed
// before an id can be assigned, so multiple app servers can generate ids
// concurrently with zero coordination. See utils/snowflake.js.
//
// Collision is vanishingly unlikely (would require the same worker to
// double-generate the same timestamp+sequence pair, which the generator
// itself already prevents), but the DB's UNIQUE constraint on short_code is
// the real safety net — on the rare unique_violation (Postgres code 23505)
// this retries once with a freshly generated id before giving up.
async function shortenWithSnowflake({ longUrl, ownerId, expiresAt, req, res }, attempt = 0) {
  const shortCode = encode(nextSnowflakeId());
  try {
    const insert = await pool.query(
      `INSERT INTO links (short_code, long_url, owner_id, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING short_code, long_url, expires_at`,
      [shortCode, longUrl, ownerId, expiresAt || null]
    );
    return res.status(201).json(toResponse(insert.rows[0], req));
  } catch (err) {
    if (err.code === '23505' && attempt < 1) {
      return shortenWithSnowflake({ longUrl, ownerId, expiresAt, req, res }, attempt + 1);
    }
    throw err;
  }
}

async function redirectUrl(req, res) {
  const { code } = req.params;

  try {
    // Cache-aside: check Redis first (see DESIGN.md section 8 / utils/cache.js).
    // linkId is cached alongside longUrl so click-event logging below never
    // needs a second DB round-trip just to resolve short_code -> id.
    let cached = await getCachedLink(code);
    let longUrl = cached?.longUrl;
    let linkId = cached?.linkId;

    if (!longUrl) {
      const result = await pool.query(
        'SELECT id, long_url, expires_at FROM links WHERE short_code = $1',
        [code]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Short link not found' });
      }

      const link = result.rows[0];
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return res.status(410).json({ error: 'This link has expired' });
      }

      longUrl = link.long_url;
      linkId = link.id;
      // Populate the cache for next time. Fire-and-forget-ish: awaited here
      // so the TTL logic runs, but any failure inside is already caught and
      // logged, never thrown (see cacheLink).
      await cacheLink(code, { longUrl, linkId }, link.expires_at);
    }

    // Fire-and-forget click counter increment — never block the redirect
    // on this write (see DESIGN.md section 6 on why click_count is async).
    pool
      .query('UPDATE links SET click_count = click_count + 1 WHERE short_code = $1', [
        code,
      ])
      .catch((err) => console.error('click_count update failed:', err));

    // Fire-and-forget detailed click event (geo/device/browser/referrer) for
    // the analytics dashboard — same non-blocking pattern as the counter
    // above, see utils/clickEvents.js.
    recordClickEvent({
      linkId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer,
    }).catch((err) => console.error('recordClickEvent failed:', err));

    return res.redirect(302, longUrl);
  } catch (err) {
    captureError(err);
    console.error('redirectUrl error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getMyLinks(req, res) {
  try {
    const result = await pool.query(
      `SELECT short_code, long_url, created_at, expires_at, click_count
       FROM links WHERE owner_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const links = result.rows.map((row) => ({
      shortCode: row.short_code,
      shortUrl: `${baseUrl}/${row.short_code}`,
      longUrl: row.long_url,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      clickCount: Number(row.click_count),
    }));
    return res.json({ links });
  } catch (err) {
    captureError(err);
    console.error('getMyLinks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getLinkAnalytics(req, res) {
  const { code } = req.params;
  try {
    const linkResult = await pool.query(
      'SELECT id FROM links WHERE short_code = $1 AND owner_id = $2',
      [code, req.user.id]
    );
    if (linkResult.rows.length === 0) {
      // Same 404 for "doesn't exist" and "not yours" — see deleteLink for
      // why we don't distinguish the two.
      return res.status(404).json({ error: 'Link not found' });
    }
    const linkId = linkResult.rows[0].id;

    // Five independent aggregate queries run in parallel rather than one
    // big query — each GROUP BY is over a different dimension, so combining
    // them into one query would require expensive self-joins for no benefit.
    const [byDay, byDevice, byBrowser, byCountry, byReferrer] = await Promise.all([
      pool.query(
        `SELECT date_trunc('day', clicked_at) AS day, COUNT(*) AS count
         FROM click_events WHERE link_id = $1 GROUP BY day ORDER BY day ASC`,
        [linkId]
      ),
      pool.query(
        `SELECT COALESCE(device, 'desktop') AS device, COUNT(*) AS count
         FROM click_events WHERE link_id = $1 GROUP BY device ORDER BY count DESC`,
        [linkId]
      ),
      pool.query(
        `SELECT COALESCE(browser, 'Unknown') AS browser, COUNT(*) AS count
         FROM click_events WHERE link_id = $1 GROUP BY browser ORDER BY count DESC`,
        [linkId]
      ),
      pool.query(
        `SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS count
         FROM click_events WHERE link_id = $1 GROUP BY country ORDER BY count DESC`,
        [linkId]
      ),
      pool.query(
        `SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*) AS count
         FROM click_events WHERE link_id = $1 GROUP BY referrer ORDER BY count DESC LIMIT 10`,
        [linkId]
      ),
    ]);

    return res.json({
      clicksByDay: byDay.rows.map((r) => ({ date: r.day, count: Number(r.count) })),
      byDevice: byDevice.rows.map((r) => ({ device: r.device, count: Number(r.count) })),
      byBrowser: byBrowser.rows.map((r) => ({ browser: r.browser, count: Number(r.count) })),
      byCountry: byCountry.rows.map((r) => ({ country: r.country, count: Number(r.count) })),
      byReferrer: byReferrer.rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) })),
    });
  } catch (err) {
    captureError(err);
    console.error('getLinkAnalytics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteLink(req, res) {
  const { code } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM links WHERE short_code = $1 AND owner_id = $2 RETURNING short_code',
      [code, req.user.id]
    );
    if (result.rows.length === 0) {
      // Either the link doesn't exist, or it exists but belongs to someone
      // else — same 404 response either way so we don't leak which case it is.
      return res.status(404).json({ error: 'Link not found' });
    }
    return res.status(204).send();
  } catch (err) {
    captureError(err);
    console.error('deleteLink error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function toResponse(row, req) {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return {
    shortCode: row.short_code,
    shortUrl: `${baseUrl}/${row.short_code}`,
    longUrl: row.long_url,
    expiresAt: row.expires_at,
  };
}

module.exports = { shortenUrl, redirectUrl, getMyLinks, getLinkAnalytics, deleteLink };
