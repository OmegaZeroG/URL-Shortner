const pool = require('../config/db');
const { encode } = require('../utils/base62');

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
        `INSERT INTO links (short_code, long_url, expires_at)
         VALUES ($1, $2, $3) RETURNING short_code, long_url, expires_at`,
        [customAlias, longUrl, expiresAt || null]
      );
      return res.status(201).json(toResponse(insert.rows[0], req));
    }

    // No custom alias: insert first to get the auto-increment id, then
    // Base62-encode that id into the short_code and update the row.
    const insert = await pool.query(
      `INSERT INTO links (short_code, long_url, expires_at)
       VALUES ('', $1, $2) RETURNING id, long_url, expires_at`,
      [longUrl, expiresAt || null]
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

    // Fire-and-forget click counter increment — never block the redirect
    // on this write (see DESIGN.md section 6 on why click_count is async).
    pool
      .query('UPDATE links SET click_count = click_count + 1 WHERE id = $1', [
        link.id,
      ])
      .catch((err) => console.error('click_count update failed:', err));

    return res.redirect(302, link.long_url);
  } catch (err) {
    console.error('redirectUrl error:', err);
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

module.exports = { shortenUrl, redirectUrl };
