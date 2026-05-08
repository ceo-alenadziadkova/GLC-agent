import { canonicalNodeKeyFromManifestAndNode } from '@glc/intake-core';

import { PLAN_BOARD_RECONCILE_PREVIEW_SAMPLE_CAP } from '../../config/plan-board-reconcile-preview-limits.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';

import { fetchRoadmapManifestSnapshotForAudit } from '../orchestration/roadmap-manifest.service.js';

import { roadmapManifestChangeSignature } from './manifest-signature.js';
import { listPlanBoardCardsForAudit } from './plan-board-cards.service.js';
import { reconcileBoardWithPack, type PlanTaskDeliveryCardSnapshot } from './reconcile.js';

/** Response body for `POST …/plan/board/reconcile/preview` (pure projection; no DB writes). */
export type PlanBoardReconcilePreviewDto = {
  orchestration_pack_version: number;
  matched: number;
  orphaned_node_removed: number;
  orphaned_lane_changed: number;
  auto_created: number;
  /** Up to `PLAN_BOARD_RECONCILE_PREVIEW_SAMPLE_CAP` new backlog rows reconcile would insert. */
  sample_new_backlog_cards: Array<{ canonical_node_key: string; title: string }>;
  /** Samples for cards that would be marked orphan (node removed). */
  sample_orphan_node_removed: Array<{ canonical_node_key: string; title: string }>;
};

function displayTitleForCard(card: PlanTaskDeliveryCardSnapshot): string {
  const raw = card.manual_title?.trim();
  if (raw) return raw;
  return card.canonical_node_key ?? card.id;
}

function titleForCanonicalKey(args: {
  pack: GlcOrchestrationPack;
  manifestSignature: string;
  canonical_node_key: string;
}): string {
  for (const node of args.pack.graph.nodes) {
    const key = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: args.manifestSignature,
      lane_id: node.lane,
      title: node.title,
      board_identity_key: node.board_identity_key ?? null,
    });
    if (key === args.canonical_node_key) return node.title;
  }
  return args.canonical_node_key;
}

/**
 * Pure reconcile projection + bounded samples for preview UX (same inputs as persist reconcile).
 */
export function buildPlanBoardReconcilePreviewDto(args: {
  manifestSignature: string;
  pack: GlcOrchestrationPack;
  orchestration_pack_version: number;
  cards: readonly PlanTaskDeliveryCardSnapshot[];
}): PlanBoardReconcilePreviewDto {
  const result = reconcileBoardWithPack({
    manifestSignature: args.manifestSignature,
    nextPack: args.pack,
    nextPackVersion: args.orchestration_pack_version,
    cards: args.cards,
  });

  const cap = PLAN_BOARD_RECONCILE_PREVIEW_SAMPLE_CAP;

  const sample_new_backlog_cards: PlanBoardReconcilePreviewDto['sample_new_backlog_cards'] = [];
  for (const ins of result.insertsPackKeys) {
    if (sample_new_backlog_cards.length >= cap) break;
    sample_new_backlog_cards.push({
      canonical_node_key: ins.canonical_node_key,
      title: titleForCanonicalKey({
        pack: args.pack,
        manifestSignature: args.manifestSignature,
        canonical_node_key: ins.canonical_node_key,
      }),
    });
  }

  const sample_orphan_node_removed: PlanBoardReconcilePreviewDto['sample_orphan_node_removed'] = [];
  for (const row of result.updatedPackCards) {
    if (sample_orphan_node_removed.length >= cap) break;
    if (row.orphaned_reason !== 'node_removed' || row.canonical_node_key == null) continue;
    sample_orphan_node_removed.push({
      canonical_node_key: row.canonical_node_key,
      title: displayTitleForCard(row),
    });
  }

  return {
    orchestration_pack_version: args.orchestration_pack_version,
    matched: result.matched,
    orphaned_node_removed: result.orphaned_node_removed,
    orphaned_lane_changed: result.orphaned_lane_changed,
    auto_created: result.auto_created,
    sample_new_backlog_cards,
    sample_orphan_node_removed,
  };
}

/** Count-only projection for tests that assert reconcile arithmetic without sample lists. */
export function computePlanBoardReconcilePreviewMetrics(args: {
  manifestSignature: string;
  pack: GlcOrchestrationPack;
  orchestration_pack_version: number;
  cards: readonly PlanTaskDeliveryCardSnapshot[];
}): Omit<PlanBoardReconcilePreviewDto, 'sample_new_backlog_cards' | 'sample_orphan_node_removed'> {
  const full = buildPlanBoardReconcilePreviewDto(args);
  return {
    orchestration_pack_version: full.orchestration_pack_version,
    matched: full.matched,
    orphaned_node_removed: full.orphaned_node_removed,
    orphaned_lane_changed: full.orphaned_lane_changed,
    auto_created: full.auto_created,
  };
}

/**
 * Loads persisted board cards + manifest snapshot, runs the same pure reconcile as pack persist / POST reconcile.
 */
export async function buildPlanBoardReconcilePreviewForAudit(args: {
  auditId: string;
  pack: GlcOrchestrationPack;
  orchestration_pack_version: number;
}): Promise<{ ok: true; preview: PlanBoardReconcilePreviewDto } | { ok: false; error: Error }> {
  const snapshot = await fetchRoadmapManifestSnapshotForAudit({
    auditId: args.auditId,
    snapshotId: args.pack.manifest_snapshot_id,
  });
  const manifestSignature = snapshot?.payload ? roadmapManifestChangeSignature(snapshot.payload) : '';

  const { cards, error } = await listPlanBoardCardsForAudit({ auditId: args.auditId });
  if (error) return { ok: false, error };

  return {
    ok: true,
    preview: buildPlanBoardReconcilePreviewDto({
      manifestSignature,
      pack: args.pack,
      orchestration_pack_version: args.orchestration_pack_version,
      cards,
    }),
  };
}
