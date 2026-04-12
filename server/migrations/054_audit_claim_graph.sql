-- Causal claim graph (Phase 8 / Sprint 4). See docs/adrs/ADR-CAUSAL-DAG.md
-- depends_on_refs: JSON array of { "phase_id": string, "claim_id": number }

CREATE TABLE IF NOT EXISTS public.audit_claim_graph (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id      uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  phase_id      text NOT NULL,
  claim_id      integer NOT NULL,
  depends_on_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'invalidated')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, phase_id, claim_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_claim_graph_audit_id
  ON public.audit_claim_graph (audit_id);

CREATE INDEX IF NOT EXISTS idx_audit_claim_graph_depends_gin
  ON public.audit_claim_graph USING gin (depends_on_refs jsonb_path_ops);

COMMENT ON TABLE public.audit_claim_graph IS
  'Cross-phase claim dependency edges per audit; Phase 8 causal DAG (FEATURE_CAUSAL_DAG).';

ALTER TABLE public.audit_claim_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_claim_graph_select_own_audit"
  ON public.audit_claim_graph
  FOR SELECT
  USING (
    audit_id IN (SELECT id FROM public.audits WHERE user_id = (SELECT auth.uid()))
  );
