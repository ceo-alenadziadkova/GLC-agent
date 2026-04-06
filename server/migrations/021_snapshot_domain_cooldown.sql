-- Cross-instance fresh-fetch cooldown for free snapshot (opt-in: SNAPSHOT_SHARED_ABUSE_STORE=1).
-- Complements in-process Map in abuse-guards.ts; service role writes/reads.

CREATE TABLE IF NOT EXISTS snapshot_domain_cooldown (
  host text PRIMARY KEY,
  last_fresh_scan_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE snapshot_domain_cooldown IS 'Last successful fresh snapshot that wrote snapshot_domain_cache for this registrable host.';
