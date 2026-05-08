-- Single round-trip: resolve latest audit_domains row by (audit_id, domain_key, version) and set status = collecting.
-- Replaces SELECT id + UPDATE id from phaseRunner (PostgREST latency).

CREATE OR REPLACE FUNCTION public.mark_audit_domain_collecting(
  p_audit_id uuid,
  p_domain_key text
)
RETURNS TABLE (audit_domain_id uuid)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT ad.id INTO v_id
  FROM public.audit_domains ad
  WHERE ad.audit_id = p_audit_id
    AND ad.domain_key = p_domain_key
  ORDER BY ad.version DESC NULLS LAST
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.audit_domains
  SET status = 'collecting'
  WHERE id = v_id;

  RETURN QUERY SELECT v_id;
END;
$$;

COMMENT ON FUNCTION public.mark_audit_domain_collecting(uuid, text) IS
  'Sets audit_domains.status = collecting for the newest version row for the given audit and domain_key; returns no rows if none exist.';

GRANT EXECUTE ON FUNCTION public.mark_audit_domain_collecting(uuid, text) TO service_role;
