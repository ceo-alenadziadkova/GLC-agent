import { describe, expect, it } from 'vitest';

import { PLAN_BOARD_COLUMN_DEFAULT_IDS } from '../config/plan-board-columns.js';
import type { PlanTaskDeliveryCardSnapshot, ReconcileBoardWithPackResult } from '../services/plan-board/reconcile.js';
import { buildPlanBoardReconcileTransactionalPayload } from '../services/plan-board/plan-board-reconcile-transactional-payload.js';

function card(patch: Partial<PlanTaskDeliveryCardSnapshot> & Pick<PlanTaskDeliveryCardSnapshot, 'id'>): PlanTaskDeliveryCardSnapshot {
  return {
    source: 'pack',
    canonical_node_key: 'ck',
    pack_graph_node_id: 'nid',
    pack_lane_snapshot: 'marketing_narrative',
    manual_title: null,
    delivery_area: 'backlog',
    column_id: PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog,
    position: 1,
    pinned: false,
    last_applied_pack_version: 1,
    orphaned_reason: null,
    ...patch,
  };
}

describe('buildPlanBoardReconcileTransactionalPayload', () => {
  it('maps updates, inserts, and event metrics for RPC', () => {
    const result: ReconcileBoardWithPackResult = {
      matched: 1,
      orphaned_node_removed: 1,
      orphaned_lane_changed: 0,
      auto_created: 1,
      updatedPackCards: [
        card({
          id: '00000000-0000-4000-8000-000000000001',
          canonical_node_key: 'k1',
          last_applied_pack_version: 9,
          orphaned_reason: null,
        }),
      ],
      insertsPackKeys: [{ canonical_node_key: 'k2', pack_graph_node_id: 'n2', lane: 'seo' }],
    };

    const payload = buildPlanBoardReconcileTransactionalPayload({
      auditId: '00000000-0000-4000-8000-0000000000aa',
      consultantUserId: '00000000-0000-4000-8000-0000000000bb',
      packVersion: 9,
      result,
      insertPositions: [1002],
      landingPackCardColumnId: PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog,
    });

    expect(payload.p_audit_id).toBe('00000000-0000-4000-8000-0000000000aa');
    expect(payload.p_updates).toHaveLength(1);
    expect(payload.p_updates[0]?.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(payload.p_inserts).toHaveLength(1);
    expect(payload.p_inserts[0]?.canonical_node_key).toBe('k2');
    expect(payload.p_inserts[0]?.position).toBe(1002);
    expect(payload.p_inserts[0]?.column_id).toBe(PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog);
    expect(payload.p_event_type).toBe('plan_board_reconciled');
    expect(payload.p_event_data).toMatchObject({
      matched: 1,
      orphaned_node_removed: 1,
      auto_created: 1,
    });
  });
});
