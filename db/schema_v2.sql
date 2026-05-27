-- JSON Forge — additive migration v2.
-- Adds the read_only column so creators can opt into view-only share links.
-- Apply remotely with:
--   pnpm wrangler d1 execute json-forge-shares --remote --file=db/schema_v2.sql
-- And locally with --local.

ALTER TABLE shares ADD COLUMN read_only INTEGER NOT NULL DEFAULT 0;
