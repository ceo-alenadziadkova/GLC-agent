-- Phase 9 / Sprint 5: auto-remediation audit trail (ADR-AUTO-REMEDIATION.md)

CREATE TABLE IF NOT EXISTS public.audit_remediations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id                 uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  phase_id                 text NOT NULL,
  error_type               text NOT NULL,
  remediation_type         text NOT NULL
                           CHECK (remediation_type IN ('tone', 'content')),
  original_excerpt         text NOT NULL,
  applied_fix              text NOT NULL,
  preconditions_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_remediations_audit_id
  ON public.audit_remediations (audit_id);

COMMENT ON TABLE public.audit_remediations IS
  'Auto-applied output fixes (Phase 9); service-role writes. See ADR-AUTO-REMEDIATION.';

ALTER TABLE public.audit_remediations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_remediations_select_own_audit"
  ON public.audit_remediations
  FOR SELECT
  USING (
    audit_id IN (SELECT id FROM public.audits WHERE user_id = (SELECT auth.uid()))
  );
