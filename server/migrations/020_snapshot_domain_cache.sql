-- Cache deterministic free snapshot results by registrable domain (host).
-- Service role bypasses RLS; no user-facing policies required for this table.

CREATE TABLE IF NOT EXISTS snapshot_domain_cache (
  host         text PRIMARY KEY,
  payload      jsonb NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshot_domain_cache_expires
  ON snapshot_domain_cache (expires_at);
