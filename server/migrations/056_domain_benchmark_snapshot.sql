-- Phase 10 / Sprint 6: domain benchmark snapshots (ADR-DOMAIN-BENCHMARKS.md)
-- Aggregates are written only by the API service role; RLS enabled with no policies
-- so the anon/authenticated PostgREST roles cannot read/write this table directly.

CREATE TABLE IF NOT EXISTS public.domain_benchmark_snapshot (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  computed_at              timestamptz NOT NULL,
  phase_id                 text NOT NULL,
  industry                 text NOT NULL,
  period                   text NOT NULL
                           CHECK (period IN ('last_30d', 'last_90d', 'all_time')),
  sample_count             integer NOT NULL CHECK (sample_count >= 0),
  p25                      numeric NOT NULL,
  p50                      numeric NOT NULL,
  p75                      numeric NOT NULL,
  p90                      numeric NOT NULL,
  avg_score                numeric NOT NULL,
  hallucination_rate_p50   numeric,
  risky_promise_rate_p50   numeric,
  unverified_rate_p50      numeric,
  top_error_types          text[],
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_benchmark_snapshot_phase_industry_period
  ON public.domain_benchmark_snapshot (phase_id, industry, period);

CREATE INDEX IF NOT EXISTS idx_domain_benchmark_snapshot_computed_at
  ON public.domain_benchmark_snapshot (computed_at DESC);

COMMENT ON TABLE public.domain_benchmark_snapshot IS
  'Nightly aggregates from evaluation_datasets; service-role writes only. See ADR-DOMAIN-BENCHMARKS.';

ALTER TABLE public.domain_benchmark_snapshot ENABLE ROW LEVEL SECURITY;

-- Optional: only if evaluation_datasets exists (051 may not have run yet on a fresh branch DB).
DO $bm$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_datasets'
  ) THEN
    CREATE INDEX IF NOT EXISTS evaluation_datasets_phase_created_at_idx
      ON public.evaluation_datasets (phase_id, created_at DESC);
  END IF;
END
$bm$;
