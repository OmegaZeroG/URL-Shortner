-- click_events already has idx_click_events_link_id (single-column, from
-- 001_init.sql) which covers the WHERE link_id = $1 filter used by every
-- analytics query. This composite index additionally covers clicked_at,
-- which specifically helps the "clicks over time" query
-- (date_trunc('day', clicked_at) ... GROUP BY day ORDER BY day ASC) — with
-- clicked_at included, Postgres can satisfy that query straight from the
-- index instead of fetching every matching row's full tuple just to read
-- one column, and can avoid a separate sort step since clicked_at is
-- already stored in index order.
--
-- The old single-column index is left in place rather than dropped: this
-- composite index's leading column (link_id) technically makes it
-- redundant, but dropping it isn't free of risk on a live table and the
-- win from removing it is negligible at this project's scale — worth
-- calling out as a known follow-up if asked, not worth doing blindly here.
CREATE INDEX IF NOT EXISTS idx_click_events_link_id_clicked_at
  ON click_events(link_id, clicked_at);
