-- Persisted Phase 0 context summary for no-site / idea / problem Recon flows.

ALTER TABLE public.audit_recon
  ADD COLUMN IF NOT EXISTS recon_context_summary jsonb;

COMMENT ON COLUMN public.audit_recon.recon_context_summary IS
  'Structured Phase 0 summary (mode, known facts, inferred insights, missing inputs, recommended next steps). Nullable for legacy rows.';
