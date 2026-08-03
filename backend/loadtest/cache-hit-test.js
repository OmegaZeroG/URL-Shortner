// Measures redirect latency on a guaranteed CACHE HIT: setup() creates one
// link and does a single warm-up request to it (that first hit is the only
// miss, and it populates Redis). Every request in the actual test below
// hits that exact same code repeatedly, so it's served entirely from Redis
// for the whole run — this is the number to compare against
// cache-miss-test.js's numbers.
//
// Run: k6 run loadtest/cache-hit-test.js

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  vus: 20,
  duration: '30s',
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/shorten`,
    JSON.stringify({ longUrl: `https://example.com/loadtest-hit-${Date.now()}` }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status !== 201) {
    throw new Error(`Setup failed creating the link: ${res.status} ${res.body}`);
  }
  const code = res.json('shortCode');

  // Warm-up request — this one is a cache MISS and populates Redis.
  // Everything after this point, including the whole test below, hits Redis.
  http.get(`${BASE_URL}/${code}`, { redirects: 0 });

  return { code };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/${data.code}`, { redirects: 0 });
  check(res, { 'status is 302 (redirect)': (r) => r.status === 302 });
}
