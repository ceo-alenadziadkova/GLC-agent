-- 072_director_deep_dive_jobs.sql
-- Phase B: director deep-dive jobs reuse `job_runs`.
-- This migration is intentionally additive and non-breaking.

alter table public.job_runs
  add column if not exists metadata jsonb;

comment on column public.job_runs.metadata is
  'Optional metadata for non-pipeline jobs (e.g. director deep-dive domain/idempotency payload refs).';

-- rollback:
-- alter table public.job_runs drop column if exists metadata;
