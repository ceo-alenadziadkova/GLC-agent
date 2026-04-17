-- Batch RPC for intake wording publish/rollback to reduce per-row round-trips.
-- Called by backend with service role key.

CREATE OR REPLACE FUNCTION public.intake_trace_apply_wording_action_batch(
  p_user_id UUID,
  p_action TEXT,
  p_question_ids TEXT[],
  p_now TIMESTAMPTZ
)
RETURNS TABLE (
  question_id TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_applied_ids TEXT[];
BEGIN
  IF p_action NOT IN ('publish', 'rollback') THEN
    RAISE EXCEPTION 'invalid intake wording action: %', p_action;
  END IF;

  IF p_action = 'publish' THEN
    WITH candidate AS (
      SELECT d.question_id, d.draft_text
      FROM intake_question_wording_drafts d
      WHERE d.user_id = p_user_id
        AND COALESCE(BTRIM(d.draft_text), '') <> ''
        AND (p_question_ids IS NULL OR d.question_id = ANY(p_question_ids))
    ),
    applied AS (
      UPDATE intake_question_wording_drafts t
      SET published_text = c.draft_text,
          published_at = p_now,
          updated_at = p_now
      FROM candidate c
      WHERE t.user_id = p_user_id
        AND t.question_id = c.question_id
      RETURNING t.question_id
    )
    SELECT ARRAY_AGG(applied.question_id) INTO v_applied_ids
    FROM applied;
  ELSE
    WITH candidate AS (
      SELECT d.question_id, d.published_text
      FROM intake_question_wording_drafts d
      WHERE d.user_id = p_user_id
        AND COALESCE(BTRIM(d.published_text), '') <> ''
        AND (p_question_ids IS NULL OR d.question_id = ANY(p_question_ids))
    ),
    applied AS (
      UPDATE intake_question_wording_drafts t
      SET draft_text = c.published_text,
          updated_at = p_now
      FROM candidate c
      WHERE t.user_id = p_user_id
        AND t.question_id = c.question_id
      RETURNING t.question_id
    )
    SELECT ARRAY_AGG(applied.question_id) INTO v_applied_ids
    FROM applied;
  END IF;

  IF COALESCE(array_length(v_applied_ids, 1), 0) > 0 THEN
    INSERT INTO intake_wording_publication_log (user_id, action, question_ids)
    VALUES (p_user_id, p_action, v_applied_ids);
  END IF;

  RETURN QUERY
  SELECT q.question_id
  FROM unnest(COALESCE(v_applied_ids, ARRAY[]::TEXT[])) AS q(question_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.intake_trace_apply_wording_action_batch(
  uuid,
  text,
  text[],
  timestamptz
) TO service_role;
