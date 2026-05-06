-- Approve pending review_points row and insert pipeline_events row in one transaction (service role).
-- Prevents orphaned approved reviews without matching review_approved event when INSERT fails separately.

CREATE OR REPLACE FUNCTION public.pipeline_approve_review_emit_approved_event_atomic(
  p_audit_id UUID,
  p_after_phase INT,
  p_consultant_notes TEXT,
  p_interview_notes TEXT,
  p_event_type TEXT,
  p_message TEXT
)
RETURNS TABLE (
  outcome TEXT,
  review_row JSONB,
  pipeline_event_id BIGINT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_review jsonb;
  v_ev_id BIGINT;
BEGIN
  UPDATE public.review_points rp
  SET
    status = 'approved',
    consultant_notes = p_consultant_notes,
    interview_notes = p_interview_notes,
    approved_at = NOW()
  WHERE rp.audit_id = p_audit_id
    AND rp.after_phase = p_after_phase
    AND rp.status = 'pending'
  RETURNING to_jsonb(rp) INTO v_review;

  IF v_review IS NULL THEN
    RETURN QUERY SELECT 'already_approved'::TEXT, NULL::JSONB, NULL::BIGINT;
    RETURN;
  END IF;

  INSERT INTO public.pipeline_events (audit_id, phase, event_type, message, data)
  VALUES (p_audit_id, p_after_phase, p_event_type, p_message, '{}'::JSONB)
  RETURNING id INTO v_ev_id;

  RETURN QUERY SELECT 'approved'::TEXT, v_review, v_ev_id;
END;
$$;

COMMENT ON FUNCTION public.pipeline_approve_review_emit_approved_event_atomic(UUID, INT, TEXT, TEXT, TEXT, TEXT) IS
  'Atomically transitions review_points pending→approved for the audit/phase gate and emits review_approved pipeline_event.';

GRANT EXECUTE ON FUNCTION public.pipeline_approve_review_emit_approved_event_atomic(UUID, INT, TEXT, TEXT, TEXT, TEXT) TO service_role;
