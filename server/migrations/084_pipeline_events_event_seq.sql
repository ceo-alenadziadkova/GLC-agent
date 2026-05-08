-- Monotonic ordering for pipeline timeline rows (ordering beyond created_at/id tie-break).
-- Backfill assigns seq in historical insert order; new rows receive the next sequence value.

ALTER TABLE public.pipeline_events
  ADD COLUMN IF NOT EXISTS event_seq bigint;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS n
  FROM public.pipeline_events
  WHERE event_seq IS NULL
)
UPDATE public.pipeline_events pe
SET event_seq = numbered.n
FROM numbered
WHERE pe.id = numbered.id;

ALTER TABLE public.pipeline_events
  ALTER COLUMN event_seq SET NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.pipeline_events_event_seq_seq;

SELECT setval(
  'public.pipeline_events_event_seq_seq',
  COALESCE((SELECT MAX(event_seq) FROM public.pipeline_events), 0),
  true
);

ALTER TABLE public.pipeline_events
  ALTER COLUMN event_seq SET DEFAULT nextval('public.pipeline_events_event_seq_seq');

ALTER SEQUENCE public.pipeline_events_event_seq_seq OWNED BY public.pipeline_events.event_seq;

COMMENT ON COLUMN public.pipeline_events.event_seq IS
  'Monotonic ordering key assigned at insert; use DESC sort with created_at/id for stable timeline views.';

CREATE INDEX IF NOT EXISTS idx_pipeline_events_audit_event_seq_desc
  ON public.pipeline_events (audit_id, event_seq DESC);
