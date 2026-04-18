-- Migration 039: Durable pipeline run state + operational table RLS hardening.

-- -----------------------------------------------------------------------------
-- 1) Durable run state for queue workers (lease/heartbeat/DLQ observability)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS phase_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  phase             int  NOT NULL,
  attempt           int  NOT NULL DEFAULT 1,
  status            text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'dead_letter')),
  lease_owner       text,
  lease_expires_at  timestamptz,
  heartbeat_at      timestamptz,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, phase, attempt)
);

CREATE TABLE IF NOT EXISTS job_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_job_id      text NOT NULL UNIQUE,
  queue_name        text NOT NULL,
  audit_id          uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  action            text NOT NULL,
  phase             int,
  attempt           int NOT NULL DEFAULT 1,
  status            text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'dead_letter')),
  lease_owner       text,
  lease_expires_at  timestamptz,
  heartbeat_at      timestamptz,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phase_runs_audit_phase ON phase_runs (audit_id, phase, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase_runs_status ON phase_runs (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_audit_action ON job_runs (audit_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs (status, updated_at DESC);

DROP TRIGGER IF EXISTS phase_runs_updated_at ON phase_runs;
CREATE TRIGGER phase_runs_updated_at
  BEFORE UPDATE ON phase_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS job_runs_updated_at ON job_runs;
CREATE TRIGGER job_runs_updated_at
  BEFORE UPDATE ON job_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE phase_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phase_runs_deny_client_access ON phase_runs;
CREATE POLICY phase_runs_deny_client_access
  ON phase_runs FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS job_runs_deny_client_access ON job_runs;
CREATE POLICY job_runs_deny_client_access
  ON job_runs FOR ALL
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 2) RLS hardening for operational/backend-only tables
-- -----------------------------------------------------------------------------

ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_domain_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshot_domain_cooldown ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intake_tokens_deny_client_access ON intake_tokens;
CREATE POLICY intake_tokens_deny_client_access
  ON intake_tokens FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS snapshot_guest_sessions_deny_client_access ON snapshot_guest_sessions;
CREATE POLICY snapshot_guest_sessions_deny_client_access
  ON snapshot_guest_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS snapshot_domain_cache_deny_client_access ON snapshot_domain_cache;
CREATE POLICY snapshot_domain_cache_deny_client_access
  ON snapshot_domain_cache FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS snapshot_domain_cooldown_deny_client_access ON snapshot_domain_cooldown;
CREATE POLICY snapshot_domain_cooldown_deny_client_access
  ON snapshot_domain_cooldown FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS intake_analytics_events_deny_client_access ON intake_analytics_events;
CREATE POLICY intake_analytics_events_deny_client_access
  ON intake_analytics_events FOR ALL
  USING (false)
  WITH CHECK (false);
