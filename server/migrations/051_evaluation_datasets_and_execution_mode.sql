-- Evaluation datasets (Phase 2 observability) + audit execution_mode (Phase 4 prep).
-- See docs/adrs/ADR-TRUTH-REGISTRY-ASSUMPTIONS.md, docs/adrs/GAP-ANALYSIS-PHASE0.md

-- ─── Audits: governance execution mode ───────────────────────────────────────
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'normal'
  CHECK (execution_mode IN ('normal', 'safe'));

COMMENT ON COLUMN public.audits.execution_mode IS
  'Pipeline governance: normal vs stricter safe mode (Phase 4+ guardrails consume this).';

-- ─── Evaluation datasets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evaluation_datasets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id          uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  phase_id          text NOT NULL,
  run_number        int NOT NULL,
  control_object    jsonb NOT NULL,
  agent_output      jsonb NOT NULL,
  cleaned_output    jsonb NOT NULL,
  human_feedback    jsonb,
  decision_applied  text CHECK (
                      decision_applied IS NULL
                      OR decision_applied IN ('accept', 'accept_with_warnings', 'refine')
                    ),
  retention_policy  text NOT NULL DEFAULT 'default'
                    CHECK (retention_policy IN ('default', 'extended', 'internal_only')),
  pii_sanitized     boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz GENERATED ALWAYS AS (
                      created_at + (
                        CASE retention_policy
                          WHEN 'extended'      THEN INTERVAL '365 days'
                          WHEN 'internal_only' THEN INTERVAL '365 days'
                          ELSE INTERVAL '90 days'
                        END
                      )
                    ) STORED,
  UNIQUE (audit_id, phase_id, run_number)
);

CREATE INDEX IF NOT EXISTS evaluation_datasets_expires_at_idx
  ON public.evaluation_datasets (expires_at);

CREATE INDEX IF NOT EXISTS evaluation_datasets_audit_id_idx
  ON public.evaluation_datasets (audit_id);

COMMENT ON TABLE public.evaluation_datasets IS
  'Per-phase run snapshots for learning/evaluation; advisory until Phase 5 aggregation.';

ALTER TABLE public.evaluation_datasets ENABLE ROW LEVEL SECURITY;

-- Consultants read rows for audits they own (service role bypasses RLS for inserts)
CREATE POLICY "evaluation_datasets_select_own_audit"
  ON public.evaluation_datasets
  FOR SELECT
  USING (
    audit_id IN (SELECT id FROM public.audits WHERE user_id = (SELECT auth.uid()))
  );
