-- Canonical audit origin metadata for admin queues and all-audits filtering.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'audit_origin'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.audit_origin AS ENUM (
      'snapshot',
      'discovery',
      'prebrief',
      'request_queue',
      'client_direct',
      'consultant_direct',
      'unknown'
    );
  END IF;
END $$;

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS origin public.audit_origin NOT NULL DEFAULT 'unknown';

-- Deterministic backfill precedence.
UPDATE public.audits AS a
SET origin = 'snapshot'
WHERE a.product_mode = 'free_snapshot' OR a.snapshot_token IS NOT NULL;

UPDATE public.audits AS a
SET origin = 'discovery'
WHERE a.origin = 'unknown'
  AND EXISTS (
    SELECT 1
    FROM public.discovery_sessions ds
    WHERE ds.audit_id = a.id
  );

UPDATE public.audits AS a
SET origin = 'prebrief'
WHERE a.origin = 'unknown'
  AND EXISTS (
    SELECT 1
    FROM public.public_brief_sessions pbs
    WHERE pbs.converted_audit_id = a.id
  );

UPDATE public.audits AS a
SET origin = 'request_queue'
WHERE a.origin = 'unknown'
  AND EXISTS (
    SELECT 1
    FROM public.audit_requests ar
    WHERE ar.audit_id = a.id
  );

UPDATE public.audits AS a
SET origin = 'client_direct'
WHERE a.origin = 'unknown'
  AND a.client_id IS NOT NULL;

UPDATE public.audits AS a
SET origin = 'consultant_direct'
WHERE a.origin = 'unknown';

CREATE INDEX IF NOT EXISTS idx_audits_origin_status_created_updated
  ON public.audits (origin, status, created_at DESC, updated_at DESC);
