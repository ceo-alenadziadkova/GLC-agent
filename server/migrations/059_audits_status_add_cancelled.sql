-- Allow explicit pipeline cancellation status.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'audits'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'audits_status_check'
  ) THEN
    ALTER TABLE public.audits DROP CONSTRAINT audits_status_check;
  END IF;
END $$;

ALTER TABLE public.audits
  ADD CONSTRAINT audits_status_check
  CHECK (status IN ('created', 'recon', 'auto', 'analytic', 'review', 'completed', 'failed', 'cancelled'));
