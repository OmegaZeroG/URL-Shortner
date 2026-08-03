// Measures redirect latency on a guaranteed CACHE MISS: setup() creates
// NUM_LINKS brand-new links (never read before, so Redis has no entry for
// any of them), then the test hits each one exactly once — forcing every
// single request through the Postgres fallback path in
// linkController.redirectUrl / utils/cache.js.
//
// Run: k6 run loadtest/cache-miss-test.js
// Requires RATE_LIMIT_MAX raised locally first — see loadtest/README.md.

import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const NUM_LINKS = 200;

export const options = {
  scenarios: {
    cache_miss: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: NUM_LINKS,
      maxDuration: '2m',
    },
  },
};

export function setup() {
  const codes = [];
  for (let i = 0; i < NUM_LINKS; i++) {
    const res = http.post(
      `${BASE_URL}/api/shorten`,
      JSON.stringify({ longUrl: `https://example.com/loadtest-miss/${i}-${Date.now()}` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status !== 201) {
      throw new Error(`Setup failed creating link ${i}: ${res.status} ${res.body}`);
    }
    codes.push(res.json('shortCode'));
  }
  return { codes };
}

export default function (data) {
  // iterationInTest is globally unique across all VUs for the
  // shared-iterations executor, so every code in the list gets hit exactly
  // once across the whole test — guaranteeing a cache miss every time.
  const idx = exec.scenario.iterationInTest;
  const code = data.codes[idx];
  const res = http.get(`${BASE_URL}/${code}`, { redirects: 0 });
  check(res, { 'status is 302 (redirect)': (r) => r.status === 302 });
}
