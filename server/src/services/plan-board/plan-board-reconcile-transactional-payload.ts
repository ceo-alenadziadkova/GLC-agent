import type { ReconcileBoardWithPackResult } from './reconcile.js';

/** Row shape for `plan_board_apply_reconcile_batch` `p_updates` JSON array. */
export type PlanBoardReconcileRpcUpdateRow = {
  id: string;
  pack_graph_node_id: string | null;
  pack_lane_snapshot: string | null;
  last_applied_pack_version: number | null;
  orphaned_reason: 'node_removed' | 'lane_changed' | null;
};

/** Row shape for `plan_board_apply_reconcile_batch` `p_inserts` JSON array. */
export type PlanBoardReconcileRpcInsertRow = {
  canonical_node_key: string;
  pack_graph_node_id: string;
  pack_lane_snapshot: string;
  delivery_area: 'backlog';
  column_id: string;
  position: number;
};

/**
 * Maps pure reconcile output into Postgres RPC JSON payloads (single transactional apply).
 */
export function buildPlanBoardReconcileTransactionalPayload(args: {
  auditId: string;
  consultantUserId: string;
  packVersion: number;
  result: ReconcileBoardWithPackResult;
  /** Tail positions for new rows (same semantics as `reconcile-pack.service`). */
  insertPositions: readonly number[];
  /** Pack-backed inserts land here (`semantics.backlog` — defaults to canonical `backlog`). */
  landingPackCardColumnId: string;
}): {
  p_audit_id: string;
  p_consultant_user_id: string;
  p_pack_version: number;
  p_updates: PlanBoardReconcileRpcUpdateRow[];
  p_inserts: PlanBoardReconcileRpcInsertRow[];
  p_event_phase: number;
  p_event_type: string;
  p_event_message: string;
  p_event_data: Record<string, number>;
} {
  const p_updates: PlanBoardReconcileRpcUpdateRow[] = args.result.updatedPackCards.map((row) => ({
    id: row.id,
    pack_graph_node_id: row.pack_graph_node_id,
    pack_lane_snapshot: row.pack_lane_snapshot,
    last_applied_pack_version: row.last_applied_pack_version,
    orphaned_reason: row.orphaned_reason,
  }));

  const p_inserts: PlanBoardReconcileRpcInsertRow[] = args.result.insertsPackKeys.map((ins, i) => ({
    canonical_node_key: ins.canonical_node_key,
    pack_graph_node_id: ins.pack_graph_node_id,
    pack_lane_snapshot: ins.lane,
    delivery_area: 'backlog',
    column_id: args.landingPackCardColumnId,
    position: args.insertPositions[i] ?? 1000 + i,
  }));

  return {
    p_audit_id: args.auditId,
    p_consultant_user_id: args.consultantUserId,
    p_pack_version: args.packVersion,
    p_updates,
    p_inserts,
    p_event_phase: 0,
    p_event_type: 'plan_board_reconciled',
    p_event_message: 'plan_board_reconciled',
    p_event_data: {
      matched: args.result.matched,
      orphaned_node_removed: args.result.orphaned_node_removed,
      orphaned_lane_changed: args.result.orphaned_lane_changed,
      auto_created: args.result.auto_created,
    },
  };
}
