-- JSON Forge — share snapshots schema (Cloudflare D1 / SQLite).
-- Apply remotely with:
--   pnpm wrangler d1 execute json-forge-shares --remote --file=db/schema.sql

CREATE TABLE IF NOT EXISTS shares (
  slug       TEXT PRIMARY KEY,         -- 10-char URL-safe slug
  payload    TEXT NOT NULL,            -- raw JSON string as the user typed it
  byte_size  INTEGER NOT NULL,         -- pre-computed UTF-8 byte length
  created_at INTEGER NOT NULL,         -- unix ms
  expires_at INTEGER NOT NULL,         -- unix ms
  ip_hash    TEXT                      -- sha256("<ip>:<salt>").hex.slice(0,16); NULL if salt missing — abuse triage only
);

CREATE INDEX IF NOT EXISTS shares_expires_at ON shares(expires_at);
