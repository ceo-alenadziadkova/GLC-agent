import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { PLAN_BOARD_COLUMN_DEFAULT_IDS } from '../../config/plan-board-columns.js';
import { fetchRoadmapManifestSnapshotForAudit } from '../orchestration/roadmap-manifest.service.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';

import { listPlanBoardCardsForAudit } from './plan-board-cards.service.js';
import { roadmapManifestChangeSignature } from './manifest-signature.js';
import { reconcileBoardWithPack } from './reconcile.js';

async function auditOwnedByConsultant(auditId: string, consultantUserId: string): Promise<boolean> {
  const { data } = await supabase
    .from('audits')
    .select('id')
    .eq('id', auditId)
    .eq('user_id', consultantUserId)
    .maybeSingle();
  return Boolean(data?.id);
}

export async function runPlanBoardReconcileAfterPackPersist(args: {
  auditId: string;
  consultantUserId: string;
  pack: GlcOrchestrationPack;
  orchestration_pack_version: number;
}): Promise<void> {
  const owned = await auditOwnedByConsultant(args.auditId, args.consultantUserId);
  if (!owned) return;

  const snapshot = await fetchRoadmapManifestSnapshotForAudit({
    auditId: args.auditId,
    snapshotId: args.pack.manifest_snapshot_id,
  });
  const manifestSignature = snapshot?.payload ? roadmapManifestChangeSignature(snapshot.payload) : '';

  const { cards, error } = await listPlanBoardCardsForAudit({ auditId: args.auditId });
  if (error) {
    logger.error('plan_board.reconcile_cards_load_failed', { auditId: args.auditId, error: error.message });
    return;
  }

  const result = reconcileBoardWithPack({
    manifestSignature,
    nextPack: args.pack,
    nextPackVersion: args.orchestration_pack_version,
    cards,
  });

  for (const row of result.updatedPackCards) {
    const { error: upErr } = await supabase
      .from('plan_task_delivery')
      .update({
        pack_graph_node_id: row.pack_graph_node_id,
        pack_lane_snapshot: row.pack_lane_snapshot,
        last_applied_pack_version: row.last_applied_pack_version,
        orphaned_reason: row.orphaned_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('audit_id', args.auditId)
      .eq('id', row.id);
    if (upErr) {
      logger.error('plan_board.reconcile_card_update_failed', { auditId: args.auditId, error: upErr.message });
    }
  }

  const { count } = await supabase
    .from('plan_task_delivery')
    .select('id', { count: 'exact', head: true })
    .eq('audit_id', args.auditId)
    .eq('column_id', PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog)
    .eq('delivery_area', 'backlog');

  let tailBase = typeof count === 'number' ? count + 1000 : 1000;

  for (const ins of result.insertsPackKeys) {
    tailBase += 1;
    const { error: insErr } = await supabase.from('plan_task_delivery').insert({
      audit_id: args.auditId,
      canonical_node_key: ins.canonical_node_key,
      pack_graph_node_id: ins.pack_graph_node_id,
      pack_lane_snapshot: ins.lane,
      source: 'pack',
      delivery_area: 'backlog',
      column_id: PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog,
      position: tailBase,
      pinned: false,
      last_applied_pack_version: args.orchestration_pack_version,
      created_by_user_id: args.consultantUserId,
    });
    if (insErr) {
      logger.error('plan_board.reconcile_insert_failed', { auditId: args.auditId, error: insErr.message });
    }
  }

  await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.planBoardReconciled,
    message: 'plan_board_reconciled',
    data: {
      matched: result.matched,
      orphaned_node_removed: result.orphaned_node_removed,
      orphaned_lane_changed: result.orphaned_lane_changed,
      auto_created: result.auto_created,
    },
  });

  logger.info('plan_board.reconciled', {
    auditId: args.auditId,
    pack_version: args.orchestration_pack_version,
    matched: result.matched,
    orphaned_node_removed: result.orphaned_node_removed,
    orphaned_lane_changed: result.orphaned_lane_changed,
    auto_created: result.auto_created,
  });
}
