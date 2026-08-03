const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Worth reporting to Sentry: no status at all (network failure, request
// never reached the server) or a 5xx (server-side bug). NOT worth
// reporting: 4xx like wrong password, duplicate email, bad input — those
// are expected user-facing validation errors, not bugs, and would just
// spam the Sentry dashboard with noise if captured on every occurrence.
export function isUnexpectedError(err) {
  return !err.status || err.status >= 500;
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // DELETE returns 204 No Content — res.json() would throw on an empty body.
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no JSON body, that's fine for 204s */
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    // Attached so callers can tell "expected" validation errors (400/401/409
    // etc — wrong password, duplicate email, bad input) apart from genuine
    // failures (network errors, 5xx) when deciding what's worth reporting to
    // Sentry. See isUnexpectedError() usage in the components' catch blocks.
    err.status = res.status;
    throw err;
  }
  return data;
}

export function shortenUrl({ longUrl, customAlias, idStrategy, token }) {
  return request('/api/shorten', {
    method: 'POST',
    body: {
      longUrl,
      ...(customAlias ? { customAlias } : {}),
      ...(idStrategy && idStrategy !== 'counter' ? { idStrategy } : {}),
    },
    token,
  });
}

export function signup(email, password) {
  return request('/api/auth/signup', { method: 'POST', body: { email, password } });
}

export function login(email, password) {
  return request('/api/auth/login', { method: 'POST', body: { email, password } });
}

export function getMyLinks(token) {
  return request('/api/links', { token });
}

export function deleteLink(token, code) {
  return request(`/api/links/${code}`, { method: 'DELETE', token });
}

export function getLinkAnalytics(token, code) {
  return request(`/api/links/${code}/analytics`, { token });
}
