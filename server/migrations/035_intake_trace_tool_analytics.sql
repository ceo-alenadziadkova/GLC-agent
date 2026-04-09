-- Consultant Intake trace tool telemetry (ADR wording / IA rollout).
-- Extends funnel table with optional JSON payload and user attribution.

ALTER TABLE intake_analytics_events
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS intake_analytics_events_user_created_idx
  ON intake_analytics_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON COLUMN intake_analytics_events.payload IS
  'Optional structured context for tool-specific events (e.g. intake trace workspace, panel, control id).';
COMMENT ON COLUMN intake_analytics_events.user_id IS
  'Consultant auth user when event is attributed (internal tools); NULL for anonymous funnel events.';
