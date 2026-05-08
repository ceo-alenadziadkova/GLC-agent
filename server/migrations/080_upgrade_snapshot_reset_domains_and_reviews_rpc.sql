-- Atomic reset of audit_domains + review_points during free_snapshot → package upgrade (service role).
-- Avoids orphaned audits if INSERT fails after DELETE.

CREATE OR REPLACE FUNCTION public.upgrade_snapshot_reset_audit_domains_and_reviews(
  p_audit_id UUID,
  p_domains JSONB,
  p_review_after_phases INTEGER[]
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.audit_domains WHERE audit_id = p_audit_id;
  DELETE FROM public.review_points WHERE audit_id = p_audit_id;

  INSERT INTO public.audit_domains (audit_id, domain_key, phase_number)
  SELECT
    p_audit_id,
    elem->>'domain_key',
    (elem->>'phase_number')::INT
  FROM jsonb_array_elements(p_domains) AS elem;

  INSERT INTO public.review_points (audit_id, after_phase)
  SELECT p_audit_id, rp
  FROM unnest(p_review_after_phases) AS rp;
END;
$$;

COMMENT ON FUNCTION public.upgrade_snapshot_reset_audit_domains_and_reviews(UUID, JSONB, INTEGER[]) IS
  'Transactional wipe + recreate domain placeholders and review_points for snapshot upgrade path.';

GRANT EXECUTE ON FUNCTION public.upgrade_snapshot_reset_audit_domains_and_reviews(UUID, JSONB, INTEGER[]) TO service_role;
