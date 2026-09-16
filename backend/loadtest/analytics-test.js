// Measures latency of GET /api/links/:code/analytics — the heaviest
// endpoint in the app, since getLinkAnalytics (see ../src/controllers/
// linkController.js) runs 2 database round trips per request (previously
// 5, before the UNION ALL consolidation — see PROGRESS.md) against
// click_events, unlike the redirect path's single Redis lookup.
//
// setup() signs up a disposable test user, creates a link under that
// account (so owner_id matches and the endpoint returns real data instead
// of a 404), then fires a burst of redirects at it to seed real
// click_events rows — an analytics query over zero rows isn't a
// representative benchmark. teardown() deletes the test link afterward;
// the throwaway test user account itself has no delete-account endpoint
// to clean up, so it's left behind on purpose (single harmless row).
//
// Run: k6 run loadtest/analytics-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const SEED_CLICKS = 50;

export const options = {
  vus: 20,
  duration: '30s',
};

export function setup() {
  const email = `loadtest-analytics-${Date.now()}@example.com`;
  const password = 'loadtest-password-1234';

  const signupRes = http.post(
    `${BASE_URL}/api/auth/signup`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (signupRes.status !== 201) {
    throw new Error(`Setup failed signing up: ${signupRes.status} ${signupRes.body}`);
  }
  const token = signupRes.json('token');
  const authHeaders = {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  };

  const shortenRes = http.post(
    `${BASE_URL}/api/shorten`,
    JSON.stringify({ longUrl: `https://example.com/loadtest-analytics-${Date.now()}` }),
    authHeaders
  );
  if (shortenRes.status !== 201) {
    throw new Error(`Setup failed creating the link: ${shortenRes.status} ${shortenRes.body}`);
  }
  const code = shortenRes.json('shortCode');

  // Seed real click_events rows so the aggregate queries have something
  // non-trivial to group — an empty table would make every query trivially
  // fast regardless of whether the index/consolidation changes helped.
  for (let i = 0; i < SEED_CLICKS; i++) {
    http.get(`${BASE_URL}/${code}`, { redirects: 0 });
  }

  return { code, token };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/api/links/${data.code}/analytics`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.1);
}

export function teardown(data) {
  http.del(`${BASE_URL}/api/links/${data.code}`, null, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
}
