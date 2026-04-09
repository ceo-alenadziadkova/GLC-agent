-- Atomic discovery -> audit conversion with ownership claim in one transaction.
-- Returns a stable error_code so API layer can map to HTTP statuses.

CREATE OR REPLACE FUNCTION public.discovery_convert_session_atomic(
  p_session_token TEXT,
  p_consultant_id UUID,
  p_company_url TEXT,
  p_product_mode TEXT,
  p_review_phases INT[],
  p_domain_keys TEXT[]
)
RETURNS TABLE (
  audit_id UUID,
  error_code TEXT,
  answers JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_session discovery_sessions%ROWTYPE;
  v_audit_id UUID;
  v_industry TEXT;
  v_company_name TEXT;
BEGIN
  SELECT *
  INTO v_session
  FROM discovery_sessions
  WHERE session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 'not_found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_session.audit_id IS NOT NULL THEN
    RETURN QUERY SELECT v_session.audit_id, 'already_converted'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_session.consultant_id IS NOT NULL AND v_session.consultant_id <> p_consultant_id THEN
    RETURN QUERY SELECT NULL::UUID, 'forbidden_owner'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_session.consultant_id IS NULL THEN
    UPDATE discovery_sessions
    SET consultant_id = p_consultant_id
    WHERE id = v_session.id
      AND consultant_id IS NULL
      AND audit_id IS NULL;
    IF NOT FOUND THEN
      RETURN QUERY SELECT NULL::UUID, 'claim_conflict'::TEXT, NULL::JSONB;
      RETURN;
    END IF;
  END IF;

  v_industry :=
    NULLIF(TRIM(COALESCE(v_session.answers->>'a2', v_session.answers->>'industry', '')), '');
  v_company_name :=
    NULLIF(TRIM(COALESCE(v_session.contact_name, v_session.contact_company, '')), '');

  INSERT INTO audits (user_id, company_url, company_name, industry, product_mode)
  VALUES (p_consultant_id, p_company_url, v_company_name, v_industry, p_product_mode)
  RETURNING id INTO v_audit_id;

  INSERT INTO review_points (audit_id, after_phase)
  SELECT v_audit_id, phase FROM unnest(p_review_phases) AS phase;

  INSERT INTO audit_domains (audit_id, domain_key, phase_number)
  SELECT v_audit_id, key, idx::INT
  FROM unnest(p_domain_keys) WITH ORDINALITY AS t(key, idx);

  INSERT INTO audit_recon (audit_id) VALUES (v_audit_id);
  INSERT INTO audit_strategy (audit_id) VALUES (v_audit_id);

  UPDATE discovery_sessions
  SET audit_id = v_audit_id,
      consultant_id = p_consultant_id
  WHERE id = v_session.id
    AND consultant_id = p_consultant_id
    AND audit_id IS NULL;

  IF NOT FOUND THEN
    DELETE FROM audits WHERE id = v_audit_id AND user_id = p_consultant_id;
    RETURN QUERY SELECT NULL::UUID, 'link_conflict'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_audit_id, NULL::TEXT, v_session.answers;
END;
$$;
