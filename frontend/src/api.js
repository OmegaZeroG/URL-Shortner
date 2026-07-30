const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export function shortenUrl({ longUrl, customAlias, token }) {
  return request('/api/shorten', {
    method: 'POST',
    body: { longUrl, ...(customAlias ? { customAlias } : {}) },
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
