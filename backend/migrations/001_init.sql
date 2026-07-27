-- Initial schema for URL Shortener
-- Run this against your PostgreSQL database before starting the server.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
  id bigserial PRIMARY KEY,
  short_code text UNIQUE NOT NULL,
  long_url text NOT NULL,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  click_count bigint DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_owner_id ON links(owner_id);

CREATE TABLE IF NOT EXISTS click_events (
  id bigserial PRIMARY KEY,
  link_id bigint REFERENCES links(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  ip_hash text,
  country text,
  device text,
  browser text,
  referrer text
);

CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_events(link_id);
