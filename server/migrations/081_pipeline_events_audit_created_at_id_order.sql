-- Stable ordering when multiple events share the same created_at (tie-break on primary key).

CREATE INDEX IF NOT EXISTS idx_pipeline_events_audit_created_at_id_desc
  ON public.pipeline_events (audit_id, created_at DESC, id DESC);
