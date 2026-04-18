-- Evaluation dataset variant attribution for Phase 6+ bandit analytics.
-- Stores selected arm explicitly to avoid JSON extraction from control_object.

ALTER TABLE public.evaluation_datasets
  ADD COLUMN IF NOT EXISTS agent_variant_id text;

COMMENT ON COLUMN public.evaluation_datasets.agent_variant_id IS
  'Bandit variant id used for this run (default or registered arm). Null when unavailable.';

CREATE INDEX IF NOT EXISTS evaluation_datasets_phase_variant_idx
  ON public.evaluation_datasets (phase_id, agent_variant_id, created_at DESC);
