import { canonicalNodeKeyFromManifestAndNode } from '@glc/intake-core';

import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';

export type PlanTaskDeliveryCardSnapshot = {
  id: string;
  source: 'pack' | 'manual';
  canonical_node_key: string | null;
  pack_graph_node_id: string | null;
  pack_lane_snapshot: string | null;
  manual_title: string | null;
  ticket_description: string | null;
  assignee: string | null;
  assignee_user_id: string | null;
  labels: string[];
  story_points: number | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  start_date: string | null;
  due_date: string | null;
  end_date: string | null;
  updated_by_user_id: string | null;
  delivery_area: string;
  column_id: string;
  position: number;
  pinned: boolean;
  last_applied_pack_version: number | null;
  orphaned_reason: 'node_removed' | 'lane_changed' | null;
};

export type ReconcileBoardWithPackResult = {
  matched: number;
  orphaned_node_removed: number;
  orphaned_lane_changed: number;
  auto_created: number;
  updatedPackCards: PlanTaskDeliveryCardSnapshot[];
  insertsPackKeys: Array<{
    canonical_node_key: string;
    pack_graph_node_id: string;
    lane: string;
  }>;
};

/**
 * Pure projection from next pack snapshot into operational cards (ADR §6 — all graph nodes).
 * Does not persist; callers map `updatedPackCards` / `insertsPackKeys` into SQL.
 */
export function reconcileBoardWithPack(args: {
  manifestSignature: string;
  nextPack: GlcOrchestrationPack;
  nextPackVersion: number;
  cards: readonly PlanTaskDeliveryCardSnapshot[];
}): ReconcileBoardWithPackResult {
  const nodes = args.nextPack.graph.nodes;

  const keyToNodeIdAndLane = new Map<string, { id: string; lane: string }>();
  for (const node of nodes) {
    const key = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: args.manifestSignature,
      lane_id: node.lane,
      title: node.title,
      board_identity_key: node.board_identity_key ?? null,
    });
    keyToNodeIdAndLane.set(key, { id: node.id, lane: node.lane });
  }

  const nextKeys = new Set(keyToNodeIdAndLane.keys());
  const existingPackKeys = new Set<string>();

  const updatedPackCards: PlanTaskDeliveryCardSnapshot[] = [];
  let matched = 0;
  let orphaned_node_removed = 0;
  let orphaned_lane_changed = 0;

  for (const card of args.cards) {
    if (card.source !== 'pack' || card.canonical_node_key == null) continue;
    existingPackKeys.add(card.canonical_node_key);
    const next = keyToNodeIdAndLane.get(card.canonical_node_key);
    if (next) {
      matched += 1;
      const prevLane = card.pack_lane_snapshot ?? null;
      const laneMismatch = prevLane != null && normalizeLane(prevLane) !== normalizeLane(next.lane);
      if (laneMismatch) orphaned_lane_changed += 1;
      updatedPackCards.push({
        ...card,
        pack_graph_node_id: next.id,
        pack_lane_snapshot: next.lane,
        last_applied_pack_version: args.nextPackVersion,
        orphaned_reason: laneMismatch ? 'lane_changed' : null,
      });
      continue;
    }

    if (!nextKeys.has(card.canonical_node_key)) {
      orphaned_node_removed += 1;
      updatedPackCards.push({
        ...card,
        last_applied_pack_version: args.nextPackVersion,
        orphaned_reason: 'node_removed',
      });
    }
  }

  let auto_created = 0;
  const insertsPackKeys: ReconcileBoardWithPackResult['insertsPackKeys'] = [];
  for (const [key, meta] of keyToNodeIdAndLane) {
    if (existingPackKeys.has(key)) continue;
    auto_created += 1;
    insertsPackKeys.push({
      canonical_node_key: key,
      pack_graph_node_id: meta.id,
      lane: meta.lane,
    });
  }

  return {
    matched,
    orphaned_node_removed,
    orphaned_lane_changed,
    auto_created,
    updatedPackCards,
    insertsPackKeys,
  };
}

function normalizeLane(lane: string): string {
  return lane.trim().toLowerCase().replace(/\s+/g, '_');
}
