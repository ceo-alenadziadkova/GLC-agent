-- Migration 009: prompt_version in audit_domains + quality_gate_passed in review_points
-- Also adds RLS policies so clients can read downstream audit tables via client_id.
-- Sprint 19 · 2026-03-31

-- ── prompt_version ─────────────────────────────────────────────────────────────
-- Records which version of the system prompt produced this domain result.
-- Written by BaseAgent.saveDomainResult() using promptVersion(domainKey).
ALTER TABLE audit_domains
  ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(20);

-- ── quality_gate_passed ─────────────────────────────────────────────────────────
-- Written by PipelineOrchestrator after consistencyChecker.run().
-- NULL = gate not yet evaluated; TRUE = passed; FALSE = failed (blockers exist).
ALTER TABLE review_points
  ADD COLUMN IF NOT EXISTS quality_gate_passed BOOLEAN;

-- ── Client-access RLS for downstream audit tables ──────────────────────────────
-- Migration 005 already grants clients SELECT on `audits` via:
--   CREATE POLICY "audits_select_own_client" ON audits
--     FOR SELECT USING (client_id = auth.uid() OR user_id = auth.uid());
--
-- The following policies grant matching SELECT access on the child tables so a
-- client who owns an audit can also read its pipeline events, domains, strategy,
-- and review points through Supabase Realtime / direct queries.

-- audit_domains
CREATE POLICY IF NOT EXISTS "audit_domains_select_client"
  ON audit_domains FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- pipeline_events
CREATE POLICY IF NOT EXISTS "pipeline_events_select_client"
  ON pipeline_events FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- audit_strategy
CREATE POLICY IF NOT EXISTS "audit_strategy_select_client"
  ON audit_strategy FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- review_points
CREATE POLICY IF NOT EXISTS "review_points_select_client"
  ON review_points FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = auth.uid() OR user_id = auth.uid()
    )
  );
