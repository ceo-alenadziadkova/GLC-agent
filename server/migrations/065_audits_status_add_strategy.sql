-- Phase 7 orchestration persists `audits.status = 'strategy'` (see `server/src/config/pipeline-status.ts` → `pipelineStatusForPhase`).
-- Migration 059's CHECK omitted `strategy`, so `UPDATE ... SET status = 'strategy'` failed silently from PostgREST's perspective
-- (0 rows returned) and `POST .../pipeline/next` surfaced 409 PIPELINE_NEXT_CLAIM_CONFLICT.

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
  CHECK (
    status IN (
      'created',
      'recon',
      'auto',
      'analytic',
      'strategy',
      'review',
      'completed',
      'failed',
      'cancelled'
    )
  );
