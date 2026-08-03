// Free, keyless IP geolocation via ip-api.com (45 req/min limit on the free
// tier — fine at this project's traffic, and this only ever runs as a
// fire-and-forget side effect of a click, never on the redirect's critical
// path). Returns a 2-letter country code, or null if the lookup fails,
// times out, or the IP is a local/dev address that can't be geolocated.
async function lookupCountry(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.')) {
    return null;
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    return data.status === 'success' ? data.countryCode : null;
  } catch (err) {
    // Network error, timeout, or rate limit — analytics is best-effort,
    // never let this throw or slow anything down.
    console.error('Geo lookup failed (non-fatal):', err.message);
    return null;
  }
}

module.exports = { lookupCountry };
