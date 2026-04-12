-- Rolling aggregates for per-phase agent metrics (CONTROL_OBJECT / Phase 5).
-- Upserted from server/src/services/agent-performance.ts (recordAgentPerformance).
-- See docs/adrs/ADR-AUTO-LOOP-RULE-ENGINE.md

CREATE TABLE IF NOT EXISTS public.agent_performance_aggregate (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id                 text NOT NULL,
  agent_number             int  NOT NULL,
  evaluation_count         int  NOT NULL DEFAULT 0,
  avg_score                numeric(6,4),
  avg_hallucination_rate   numeric(6,4),
  avg_risky_promise_rate   numeric(6,4),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phase_id, agent_number)
);

CREATE INDEX IF NOT EXISTS agent_performance_aggregate_phase_idx
  ON public.agent_performance_aggregate (phase_id);

COMMENT ON TABLE public.agent_performance_aggregate IS
  'Rolling averages of governance metrics per (phase_id, agent_number); backend service-role writes only.';

ALTER TABLE public.agent_performance_aggregate ENABLE ROW LEVEL SECURITY;

-- Intentionally no GRANT to anon/authenticated: consultants do not query this table from the client.
-- Service role (backend) bypasses RLS for upserts.
