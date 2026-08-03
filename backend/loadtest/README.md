# Load Testing

Benchmarks redirect latency for the two paths in `redirectUrl` (see `../src/controllers/linkController.js` and `../src/utils/cache.js`): a cache **miss** (falls through to Postgres) and a cache **hit** (served entirely from Redis). Run both and compare — that comparison is the number worth putting in the README and talking about in an interview.

Run this against your **local** dev server, not the live Render URL — it still hits real Neon and Upstash over the network (nothing is mocked), so the numbers are real, but it avoids burning through Render's free-tier compute or Upstash's free command quota on a public endpoint.

## 1. Install k6

Windows:
```
winget install -e --id k6.k6
```
Verify: `k6 version`. (Other platforms: see https://grafana.com/docs/k6/latest/set-up/install-k6/)

## 2. Temporarily raise the rate limit

The setup phase of these scripts creates up to 200 links via `POST /api/shorten`, which is normally capped at 10/minute per IP (see `../src/middleware/rateLimiter.js`). Raise it just for this test run:

In `backend/.env`, add:
```
RATE_LIMIT_MAX=1000
```
Restart the dev server (`npm run dev`) so it picks up the change.

**Important**: remove or comment out `RATE_LIMIT_MAX` from `.env` when you're done — it only affects your local machine (`.env` is gitignored, never committed, and Render's deployed instance doesn't have this variable set, so production stays at the real 10/minute regardless). This step is just to avoid the local test tripping its own rate limit mid-run.

## 3. Run both tests

With the backend running locally (`npm run dev`, default `http://localhost:4000`):

```
cd backend
k6 run loadtest/cache-miss-test.js
k6 run loadtest/cache-hit-test.js
```

## 4. Read the results

k6 prints a summary with `http_req_duration` percentiles (p50, p90, p95, max) automatically. The numbers that matter:

- **Cache miss** `http_req_duration` — latency when the request falls through to Postgres.
- **Cache hit** `http_req_duration` — latency when served entirely from Redis.

The gap between these two is the actual, measured value the Redis cache-aside layer is providing — not a guess, real numbers from your own deployment. Record both p50 and p95 (p95 matters more for a "how does it behave under load" story than the average).

## 5. Put the numbers in the README

Once you have both results, tell me the numbers and I'll add a "Load Test Results" section to the main README with a short table — this is the piece most candidates skip, so it's worth having front and center.
