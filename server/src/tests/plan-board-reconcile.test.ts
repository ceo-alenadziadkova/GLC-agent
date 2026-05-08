import { canonicalNodeKeyFromManifestAndNode } from '@glc/intake-core';
import { describe, expect, it } from 'vitest';

import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import type { PlanTaskDeliveryCardSnapshot } from '../services/plan-board/reconcile.js';
import { reconcileBoardWithPack } from '../services/plan-board/reconcile.js';
import {
  buildPlanBoardReconcilePreviewDto,
  computePlanBoardReconcilePreviewMetrics,
} from '../services/plan-board/plan-board-reconcile-preview.service.js';

const MANIFEST_SIG = 'fixture-manifest-signature';

function buildPack(
  graphNodes: Array<{ id: string; title: string; lane?: string; board_identity_key?: string }>,
): GlcOrchestrationPack {
  const nodes = graphNodes.map((n) => ({
    id: n.id,
    title: n.title,
    domain: 'marketing_utp' as const,
    lane: (n.lane ?? 'marketing_narrative') as (typeof ORCHESTRATION_LANE_IDS)[number],
    ...(n.board_identity_key ? { board_identity_key: n.board_identity_key } : {}),
  }));

  const lanes = Object.fromEntries(
    ORCHESTRATION_LANE_IDS.map((laneId) => [
      laneId,
      nodes.filter((node) => node.lane === laneId).map((node) => node.id),
    ]),
  ) as Record<(typeof ORCHESTRATION_LANE_IDS)[number], string[]>;

  const raw = {
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: { nodes, edges: [] },
    lanes,
    critical_path: nodes.map((n) => n.id),
    conflicts_resolved: [],
    manifest_snapshot_id: '00000000-0000-4000-8000-000000000099',
    phase_diagnostic: {
      dominant_constraint: 'capacity' as const,
      constraint_chain: ['capacity'],
    },
    routing_profile: {
      strategy: 'toc_dynamic_routing_v1' as const,
      domain_weights: { marketing_utp: 1 },
    },
  };
  return GlcOrchestrationPackSchema.parse(raw);
}

function snapshotCard(
  patch: Partial<PlanTaskDeliveryCardSnapshot> & Pick<
    PlanTaskDeliveryCardSnapshot,
    | 'id'
    | 'source'
    | 'canonical_node_key'
    | 'pack_graph_node_id'
    | 'pack_lane_snapshot'
    | 'delivery_area'
    | 'column_id'
    | 'position'
    | 'pinned'
    | 'last_applied_pack_version'
    | 'orphaned_reason'
  >,
): PlanTaskDeliveryCardSnapshot {
  return {
    ...patch,
    manual_title: null,
    ticket_description: patch.ticket_description ?? null,
    assignee: patch.assignee ?? null,
    assignee_user_id: patch.assignee_user_id ?? null,
    labels: patch.labels ?? [],
    story_points: patch.story_points ?? null,
    priority: patch.priority ?? null,
    start_date: patch.start_date ?? null,
    due_date: patch.due_date ?? null,
    end_date: patch.end_date ?? null,
    updated_by_user_id: patch.updated_by_user_id ?? null,
  };
}

describe('reconcileBoardWithPack', () => {
  it('proposes inserts for every graph node without existing rows', () => {
    const pack = buildPack([
      { id: 'a', title: 'Alpha wave', lane: 'marketing_narrative' },
      { id: 'b', title: 'Beta', lane: 'seo' },
    ]);

    const result = reconcileBoardWithPack({
      manifestSignature: MANIFEST_SIG,
      nextPack: pack,
      nextPackVersion: 7,
      cards: [],
    });

    expect(result.auto_created).toBe(2);
    expect(result.insertsPackKeys.map((row) => row.pack_graph_node_id).sort()).toEqual(['a', 'b'].sort());
    expect(result.orphaned_node_removed).toBe(0);
  });

  it('marks removed graph nodes as node_removed orphans', () => {
    const missingKey = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: MANIFEST_SIG,
      lane_id: 'marketing_narrative',
      title: 'Detached initiative',
    });

    const pack = buildPack([{ id: 'kept', title: 'Keeps lane', lane: 'marketing_narrative' }]);
    const card = snapshotCard({
      id: 'c1',
      source: 'pack',
      canonical_node_key: missingKey,
      pack_graph_node_id: 'ghost',
      pack_lane_snapshot: 'marketing_narrative',
      delivery_area: 'backlog',
      column_id: 'backlog',
      position: 0,
      pinned: false,
      last_applied_pack_version: 6,
      orphaned_reason: null,
    });

    const result = reconcileBoardWithPack({
      manifestSignature: MANIFEST_SIG,
      nextPack: pack,
      nextPackVersion: 8,
      cards: [card],
    });

    expect(result.orphaned_node_removed).toBe(1);
    const updated = result.updatedPackCards.find((row) => row.id === 'c1');
    expect(updated?.orphaned_reason).toBe('node_removed');
  });

  it('remaps pack graph ids while lane/title-derived canonical key stays stable', () => {
    const key = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: MANIFEST_SIG,
      lane_id: 'marketing_narrative',
      title: 'Stable initiative',
    });
    const pack = buildPack([{ id: 'fresh-graph-id', title: 'Stable initiative', lane: 'marketing_narrative' }]);
    const card = snapshotCard({
      id: 'graph-card',
      source: 'pack',
      canonical_node_key: key,
      pack_graph_node_id: 'stale-graph-id',
      pack_lane_snapshot: 'marketing_narrative',
      delivery_area: 'backlog',
      column_id: 'backlog',
      position: 0,
      pinned: false,
      last_applied_pack_version: 9,
      orphaned_reason: null,
    });

    const result = reconcileBoardWithPack({
      manifestSignature: MANIFEST_SIG,
      nextPack: pack,
      nextPackVersion: 10,
      cards: [card],
    });

    expect(result.matched).toBe(1);
    const updated = result.updatedPackCards.find((row) => row.id === 'graph-card');
    expect(updated?.pack_graph_node_id).toBe('fresh-graph-id');
    expect(updated?.orphaned_reason).toBeNull();
    expect(updated?.last_applied_pack_version).toBe(10);
  });

  it('matches when graph title changed but board_identity_key preserved (Epic 1)', () => {
    const key = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: MANIFEST_SIG,
      lane_id: 'marketing_narrative',
      title: 'ignored when identity present',
      board_identity_key: 'stable-init-1',
    });
    const pack = buildPack([
      { id: 'n1', title: 'Completely renamed title', lane: 'marketing_narrative', board_identity_key: 'stable-init-1' },
    ]);
    const card = snapshotCard({
      id: 'c-id',
      source: 'pack',
      canonical_node_key: key,
      pack_graph_node_id: 'n1',
      pack_lane_snapshot: 'marketing_narrative',
      delivery_area: 'board',
      column_id: 'in_progress',
      position: 0,
      pinned: false,
      last_applied_pack_version: 3,
      orphaned_reason: null,
    });

    const result = reconcileBoardWithPack({
      manifestSignature: MANIFEST_SIG,
      nextPack: pack,
      nextPackVersion: 4,
      cards: [card],
    });

    expect(result.matched).toBe(1);
    const updated = result.updatedPackCards.find((row) => row.id === 'c-id');
    expect(updated?.pack_graph_node_id).toBe('n1');
    expect(updated?.orphaned_reason).toBeNull();
  });

  it('computePlanBoardReconcilePreviewMetrics matches reconcileBoardWithPack summary fields', () => {
    const pack = buildPack([
      { id: 'a', title: 'Alpha wave', lane: 'marketing_narrative' },
      { id: 'b', title: 'Beta', lane: 'seo' },
    ]);
    const cards: PlanTaskDeliveryCardSnapshot[] = [];
    const nextPackVersion = 7;
    const r = reconcileBoardWithPack({
      manifestSignature: MANIFEST_SIG,
      nextPack: pack,
      nextPackVersion,
      cards,
    });
    const p = computePlanBoardReconcilePreviewMetrics({
      manifestSignature: MANIFEST_SIG,
      pack,
      orchestration_pack_version: nextPackVersion,
      cards,
    });
    expect(p).toEqual({
      orchestration_pack_version: nextPackVersion,
      matched: r.matched,
      orphaned_node_removed: r.orphaned_node_removed,
      orphaned_lane_changed: r.orphaned_lane_changed,
      auto_created: r.auto_created,
    });
  });

  it('buildPlanBoardReconcilePreviewDto includes title samples for new nodes and node_removed orphans', () => {
    const missingKey = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: MANIFEST_SIG,
      lane_id: 'marketing_narrative',
      title: 'Detached initiative',
    });
    const pack = buildPack([
      { id: 'n-stay', title: 'Staying node', lane: 'marketing_narrative' },
      { id: 'n-new', title: 'Brand new node', lane: 'seo' },
    ]);
    const card = snapshotCard({
      id: 'card-1',
      source: 'pack',
      canonical_node_key: missingKey,
      pack_graph_node_id: 'old',
      pack_lane_snapshot: 'marketing_narrative',
      delivery_area: 'backlog',
      column_id: 'backlog',
      position: 0,
      pinned: false,
      last_applied_pack_version: 4,
      orphaned_reason: null,
    });
    const dto = buildPlanBoardReconcilePreviewDto({
      manifestSignature: MANIFEST_SIG,
      pack,
      orchestration_pack_version: 5,
      cards: [card],
    });
    expect(dto.sample_new_backlog_cards.some((s) => s.title === 'Brand new node')).toBe(true);
    expect(dto.sample_orphan_node_removed.some((s) => s.canonical_node_key === missingKey)).toBe(true);
  });
});
