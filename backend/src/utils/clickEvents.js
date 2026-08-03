const crypto = require('crypto');
const { UAParser } = require('ua-parser-js');
const pool = require('../config/db');
const { lookupCountry } = require('./geo');

// Store a hash, never the raw IP — see DESIGN.md section 6 (privacy note on
// the click_events schema).
function hashIp(ip) {
  return crypto.createHash('sha256').update(ip || '').digest('hex');
}

// Fire-and-forget: called from redirectUrl but never awaited on the
// response path, and every failure inside is caught here so it can never
// throw back up and affect the redirect that already succeeded.
async function recordClickEvent({ linkId, ip, userAgent, referrer }) {
  if (!linkId) return; // shouldn't happen, but never let analytics break anything

  try {
    const parser = new UAParser(userAgent || '');
    const device = parser.getDevice().type || 'desktop'; // ua-parser-js leaves this undefined for regular desktop UAs
    const browser = parser.getBrowser().name || 'Unknown';
    const country = await lookupCountry(ip);

    await pool.query(
      `INSERT INTO click_events (link_id, ip_hash, country, device, browser, referrer)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [linkId, hashIp(ip), country, device, browser, referrer || null]
    );
  } catch (err) {
    console.error('recordClickEvent failed (non-fatal):', err.message);
  }
}

module.exports = { recordClickEvent };
