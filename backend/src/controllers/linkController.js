const pool = require('../config/db');
const { encode } = require('../utils/base62');
const { getCachedLongUrl, cacheLongUrl } = require('../utils/cache');

const CUSTOM_ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

async function shortenUrl(req, res) {
  const { longUrl, customAlias, expiresAt } = req.body;

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

    // No custom alias: insert first to get the auto-increment id, then
    // Base62-encode that id into the short_code and update the row.
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
    console.error('shortenUrl error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function redirectUrl(req, res) {
  const { code } = req.params;

  try {
    // Cache-aside: check Redis first (see DESIGN.md section 8 / utils/cache.js).
    let longUrl = await getCachedLongUrl(code);

    if (!longUrl) {
      const result = await pool.query(
        'SELECT long_url, expires_at FROM links WHERE short_code = $1',
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
      // Populate the cache for next time. Fire-and-forget-ish: awaited here
      // so the TTL logic runs, but any failure inside is already caught and
      // logged, never thrown (see cacheLongUrl).
      await cacheLongUrl(code, longUrl, link.expires_at);
    }

    // Fire-and-forget click counter increment — never block the redirect
    // on this write (see DESIGN.md section 6 on why click_count is async).
    pool
      .query('UPDATE links SET click_count = click_count + 1 WHERE short_code = $1', [
        code,
      ])
      .catch((err) => console.error('click_count update failed:', err));

    return res.redirect(302, longUrl);
  } catch (err) {
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
    console.error('getMyLinks error:', err);
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

module.exports = { shortenUrl, redirectUrl, getMyLinks, deleteLink };
