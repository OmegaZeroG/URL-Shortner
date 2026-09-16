-- Benchmark script for the composite index added in
-- migrations/002_analytics_composite_index.sql.
--
-- Run each numbered section IN ORDER, in Neon's SQL Editor (or psql).
-- NOTE: `:test_link_id` is a placeholder, not real SQL syntax Neon's web
-- editor understands — after step 1 returns an id (e.g. 42), literally
-- find-and-replace every `:test_link_id` below with that number before
-- running each section. (If you're using psql instead, `\set test_link_id 42`
-- makes the `:test_link_id` syntax work as-is.)
-- Why this exists: click_events has too few real rows right now for an
-- index to show a measurable difference — a full table scan on 5 rows and
-- an index scan on 5 rows both take microseconds. This seeds a disposable
-- synthetic dataset large enough to show a real difference, measures
-- before/after with EXPLAIN ANALYZE, then deletes every row it added.
-- Nothing here touches your real links or click data.

-- ============================================================
-- 1. Create a disposable test link (safe — owner_id NULL, easy to spot)
-- ============================================================
INSERT INTO links (short_code, long_url, owner_id)
VALUES ('__benchmark_test__', 'https://example.com/benchmark', NULL)
RETURNING id;
-- Copy the returned id — you'll paste it in place of :test_link_id below.

-- ============================================================
-- 2. Seed 200,000 synthetic click_events rows for that link, spread over
--    the last 90 days, with randomized device/browser/country/referrer —
--    enough volume for the query planner's choice to actually matter.
--    Replace :test_link_id with the id from step 1.
-- ============================================================
INSERT INTO click_events (link_id, clicked_at, ip_hash, country, device, browser, referrer)
SELECT
  :test_link_id,
  now() - (random() * interval '90 days'),
  md5(random()::text),
  (ARRAY['US','IN','GB','DE','BR'])[floor(random() * 5 + 1)],
  (ARRAY['desktop','mobile'])[floor(random() * 2 + 1)],
  (ARRAY['Chrome','Firefox','Safari'])[floor(random() * 3 + 1)],
  (ARRAY['', 'https://twitter.com', 'https://youtube.com'])[floor(random() * 3 + 1)]
FROM generate_series(1, 200000);

-- ============================================================
-- 3a. Safety step — run this unconditionally, even if you already ran
--     `npm run migrate` and migration 002 already created the composite
--     index. Dropping it here guarantees the "BEFORE" measurement below is
--     genuinely before, regardless of what order you did things in.
-- ============================================================
DROP INDEX IF EXISTS idx_click_events_link_id_clicked_at;

-- ============================================================
-- 3b. BEFORE — run this now, while only the original single-column index
--    (idx_click_events_link_id) exists. This is the query behind the
--    "clicks over time" chart. Note the execution time and whether the
--    plan shows a Sort node.
-- ============================================================
EXPLAIN ANALYZE
SELECT date_trunc('day', clicked_at) AS day, COUNT(*) AS count
FROM click_events WHERE link_id = :test_link_id
GROUP BY day ORDER BY day ASC;

-- ============================================================
-- 4. Apply the new composite index (same statement as the migration file)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_click_events_link_id_clicked_at
  ON click_events(link_id, clicked_at);

-- ============================================================
-- 5. AFTER — same query, now with the composite index available. Compare
--    the execution time and plan against step 3.
-- ============================================================
EXPLAIN ANALYZE
SELECT date_trunc('day', clicked_at) AS day, COUNT(*) AS count
FROM click_events WHERE link_id = :test_link_id
GROUP BY day ORDER BY day ASC;

-- ============================================================
-- 6. Cleanup — delete every synthetic row and the test link. Run this
--    even if you don't finish the rest, so nothing disposable is left
--    behind.
-- ============================================================
DELETE FROM click_events WHERE link_id = :test_link_id;
DELETE FROM links WHERE short_code = '__benchmark_test__';
