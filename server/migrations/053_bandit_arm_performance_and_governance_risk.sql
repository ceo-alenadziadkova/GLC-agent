-- Bandit arm rolling averages (Sprint 2 / ADR-ML-BANDITS) + optional governance risk tier on audits.
-- Written from server/src/services/bandit.ts (recordArmResult, fetchArmPerformance).

-- ─── Audits: optional governance risk classification for CONTROL_OBJECT.context.risk_profile ─
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS governance_risk_profile text
  CHECK (
    governance_risk_profile IS NULL
    OR governance_risk_profile IN ('low', 'medium', 'high', 'enterprise')
  );

COMMENT ON COLUMN public.audits.governance_risk_profile IS
  'Optional tier for Decision Layer / FactChecker; null = derive from product_mode in application.';

-- ─── Bandit per-arm stats (phase_id x variant_id) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.bandit_arm_performance (
  phase_id    text NOT NULL,
  variant_id  text NOT NULL,
  run_count   int NOT NULL DEFAULT 0,
  avg_score   numeric(8, 4) NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (phase_id, variant_id)
);

CREATE INDEX IF NOT EXISTS bandit_arm_performance_phase_idx
  ON public.bandit_arm_performance (phase_id);

COMMENT ON TABLE public.bandit_arm_performance IS
  'Epsilon-greedy bandit arm stats; service-role writes only. See ADR-ML-BANDITS.';

ALTER TABLE public.bandit_arm_performance ENABLE ROW LEVEL SECURITY;
