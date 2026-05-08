-- Single-transaction reconcile apply for plan_task_delivery + pipeline_events (TD-024 / GLC-PB-023).
-- Advisory lock serializes reconcile vs concurrent PATCH for the same audit within this transaction.

CREATE OR REPLACE FUNCTION public.plan_board_apply_reconcile_batch(
  p_audit_id uuid,
  p_consultant_user_id uuid,
  p_pack_version integer,
  p_updates jsonb,
  p_inserts jsonb,
  p_event_phase integer,
  p_event_type text,
  p_event_message text,
  p_event_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.audits a
    WHERE a.id = p_audit_id AND a.user_id = p_consultant_user_id
  ) THEN
    RAISE EXCEPTION 'plan_board_reconcile_audit_not_owned';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_audit_id::text, 0));

  UPDATE public.plan_task_delivery AS p
  SET
    pack_graph_node_id = CASE
      WHEN elem->'pack_graph_node_id' IS NULL OR jsonb_typeof(elem->'pack_graph_node_id') = 'null' THEN NULL
      ELSE NULLIF(elem->>'pack_graph_node_id', '')
    END,
    pack_lane_snapshot = CASE
      WHEN elem->'pack_lane_snapshot' IS NULL OR jsonb_typeof(elem->'pack_lane_snapshot') = 'null' THEN NULL
      ELSE NULLIF(elem->>'pack_lane_snapshot', '')
    END,
    last_applied_pack_version = (elem->>'last_applied_pack_version')::integer,
    orphaned_reason = CASE
      WHEN elem->'orphaned_reason' IS NULL OR jsonb_typeof(elem->'orphaned_reason') = 'null' THEN NULL
      ELSE NULLIF(elem->>'orphaned_reason', '')
    END,
    updated_at = now()
  FROM jsonb_array_elements(p_updates) AS elem
  WHERE p.id = (elem->>'id')::uuid
    AND p.audit_id = p_audit_id;

  INSERT INTO public.plan_task_delivery (
    audit_id,
    canonical_node_key,
    pack_graph_node_id,
    pack_lane_snapshot,
    source,
    delivery_area,
    column_id,
    position,
    pinned,
    last_applied_pack_version,
    created_by_user_id
  )
  SELECT
    p_audit_id,
    ins->>'canonical_node_key',
    ins->>'pack_graph_node_id',
    NULLIF(ins->>'pack_lane_snapshot', ''),
    'pack',
    ins->>'delivery_area',
    ins->>'column_id',
    (ins->>'position')::double precision,
    false,
    p_pack_version,
    p_consultant_user_id
  FROM jsonb_array_elements(p_inserts) AS ins;

  INSERT INTO public.pipeline_events (audit_id, phase, event_type, message, data)
  VALUES (p_audit_id, p_event_phase, p_event_type, p_event_message, COALESCE(p_event_data, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.plan_board_apply_reconcile_batch(
  uuid,
  uuid,
  integer,
  jsonb,
  jsonb,
  integer,
  text,
  text,
  jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.plan_board_apply_reconcile_batch(
  uuid,
  uuid,
  integer,
  jsonb,
  jsonb,
  integer,
  text,
  text,
  jsonb
) TO service_role;

COMMENT ON FUNCTION public.plan_board_apply_reconcile_batch IS
  'Applies Delivery Board reconcile updates/inserts + plan_board_reconciled pipeline_event in one transaction (service_role only).';
