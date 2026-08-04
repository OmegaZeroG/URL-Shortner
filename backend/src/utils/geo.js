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
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    if (data.status !== 'success') {
      // ip-api.com returns status: "fail" with a `message` explaining why
      // (e.g. "private range", "reserved range", "invalid query") — logging
      // it is what makes a silent Unknown debuggable instead of a mystery.
      console.error(`Geo lookup returned non-success for ip=${ip}:`, data.message);
      return null;
    }
    return data.countryCode;
  } catch (err) {
    // Network error, timeout, or rate limit — analytics is best-effort,
    // never let this throw or slow anything down. Logging the IP alongside
    // the error is what makes this debuggable: it tells us whether req.ip
    // resolved to a real public address (proxy trust is fine, ip-api.com
    // itself failed) or something private/internal (proxy trust is broken).
    console.error(`Geo lookup failed for ip=${ip} (non-fatal):`, err.message);
    return null;
  }
}

module.exports = { lookupCountry };
