-- Intake funnel analytics (ADR Phase G). Anonymous public_discovery events + optional version tuple.
-- No RLS: backend uses service role (same pattern as discovery_sessions).

CREATE TABLE IF NOT EXISTS intake_analytics_events (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),
  surface                   TEXT         NOT NULL,
  event_type                TEXT         NOT NULL,
  client_session_id         TEXT         NOT NULL,
  discovery_session_token   TEXT         NULL,
  question_id               TEXT         NULL,
  step_index                INT          NULL,
  intake_versions           JSONB        NULL,
  client_ts                 TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS intake_analytics_events_created_idx
  ON intake_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS intake_analytics_events_session_idx
  ON intake_analytics_events (client_session_id);
CREATE INDEX IF NOT EXISTS intake_analytics_events_type_idx
  ON intake_analytics_events (event_type);
CREATE INDEX IF NOT EXISTS intake_analytics_events_discovery_token_idx
  ON intake_analytics_events (discovery_session_token)
  WHERE discovery_session_token IS NOT NULL;
