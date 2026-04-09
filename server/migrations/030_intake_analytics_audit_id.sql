-- Link intake funnel events to an audit when the user is authenticated (ADR Phase G).

ALTER TABLE intake_analytics_events
  ADD COLUMN IF NOT EXISTS audit_id UUID REFERENCES audits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS intake_analytics_events_audit_idx
  ON intake_analytics_events (audit_id)
  WHERE audit_id IS NOT NULL;
