import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import type { RoadmapManifestPayload } from '../schemas/roadmap-manifest.js';
import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import {
  ORCHESTRATION_TIMELINE_POLICY,
  partitionCriticalPathForTimelineDisplay,
  partitionCriticalPathIntoSeasonBuckets,
} from '../config/orchestration-timeline-policy.js';

const SNAPSHOT_ID = '00000000-0000-4000-8000-0000000000a1';
const AUDIT_ID = 'audit-timeline-read-1';
const USER_ID = 'user-1';

const mocks = vi.hoisted(() => ({
  fetchPersisted: vi.fn(),
  loadExecutionPlan: vi.fn(),
  listSnapshots: vi.fn(),
  fetchSnapshot: vi.fn(),
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: mocks.fetchPersisted,
  loadAuditExecutionPlanRow: mocks.loadExecutionPlan,
}));

vi.mock('../services/orchestration/roadmap-manifest.service.js', () => ({
  listRoadmapManifestSnapshotsForAudit: mocks.listSnapshots,
  fetchRoadmapManifestSnapshotForAudit: mocks.fetchSnapshot,
}));

import { buildClientTimelineReadModel } from '../services/orchestration/orchestrator-timeline-read.service.js';

function baseManifest(seasonPreset: RoadmapManifestPayload['season_preset']): RoadmapManifestPayload {
  return {
    schema_version: 2,
    selected_domains: ['marketing_utp'],
    change_scenario: 'integrate_existing',
    season_preset: seasonPreset,
  };
}

function emptyLanes(nodeIdsByLane: Partial<Record<(typeof ORCHESTRATION_LANE_IDS)[number], string[]>>): GlcOrchestrationPack['lanes'] {
  const o = Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, nodeIdsByLane[l] ?? []])) as GlcOrchestrationPack['lanes'];
  return o;
}

function minimalPack(overrides: Partial<GlcOrchestrationPack> & Pick<GlcOrchestrationPack, 'graph' | 'critical_path' | 'lanes'>): GlcOrchestrationPack {
  return {
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    conflicts_resolved: [],
    manifest_snapshot_id: SNAPSHOT_ID,
    phase_diagnostic: { dominant_constraint: 'capacity', constraint_chain: ['capacity'] },
    routing_profile: { strategy: 'toc_dynamic_routing_v1', domain_weights: { marketing_utp: 1 } },
    execution_mode: 'deterministic',
    confidence_map: { node_confidence: {} },
    risk_layer: { node_risk: {} },
    domain_influence: { domain_weights: {} },
    input_quality: {
      input_mode: 'strategy_fallback',
      input_gate_status: 'finalized',
      director_coverage_ratio: 0,
      director_input_coverage_ratio: 0,
      degraded: false,
    },
    ...overrides,
  } as GlcOrchestrationPack;
}

describe('buildClientTimelineReadModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadExecutionPlan.mockResolvedValue({
      plan: {
        selected_domains: ['marketing_utp'],
        depth: 'standard',
        source: 'user_selected',
        recommended_domains: [],
        include_strategy: true,
      },
    });
    mocks.listSnapshots.mockResolvedValue({
      snapshots: [
        {
          id: SNAPSHOT_ID,
          created_at: '2026-04-01T00:00:00.000Z',
          payload: baseManifest('rolling_90d'),
        },
      ],
      error: null,
    });
    mocks.fetchSnapshot.mockImplementation(async (args: { auditId: string; snapshotId: string }) => {
      if (args.snapshotId !== SNAPSHOT_ID) return null;
      return { id: SNAPSHOT_ID, payload: baseManifest('rolling_30d') };
    });
  });

  it('maps seasons to partitionCriticalPathIntoSeasonBuckets using manifest season_preset from pack snapshot', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => `n${i}`);
    const nodes = ids.map((id) => ({
      id,
      title: id,
      domain: 'marketing_utp' as const,
      lane: 'marketing_narrative' as const,
    }));
    const pack = minimalPack({
      graph: { nodes, edges: [] },
      lanes: emptyLanes({ marketing_narrative: ids }),
      critical_path: ids,
    });
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack,
      orchestration_pack_version: 3,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    const expected = partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_30d');
    const byId = new Map(out.timeline.seasons.map((s) => [s.id, s.node_ids] as const));
    expect(byId.get('near')).toEqual(expected.near);
    expect(byId.get('mid')).toEqual(expected.mid);
    expect(byId.get('far')).toEqual(expected.far);
    expect(out.timeline.version.season_preset).toBe('rolling_30d');
  });

  it('truncates dependencies to ORCHESTRATION_TIMELINE_POLICY.maxDependencyRows in graph order', async () => {
    const core = ['a', 'b', 'c'];
    const extraNodes = Array.from({ length: 30 }, (_, i) => ({
      id: `e${i}`,
      title: `E${i}`,
      domain: 'marketing_utp' as const,
      lane: 'marketing_narrative' as const,
    }));
    const coreNodes = core.map((id) => ({
      id,
      title: id,
      domain: 'marketing_utp' as const,
      lane: 'marketing_narrative' as const,
    }));
    const nodes = [...coreNodes, ...extraNodes];
    const edges = extraNodes.map((n, i) => ({
      from: 'a',
      to: n.id,
      relation: 'weak' as const,
      weight: 0.2,
    }));
    const allLaneIds = [...core, ...extraNodes.map((n) => n.id)];
    const pack = minimalPack({
      graph: { nodes, edges },
      lanes: emptyLanes({ marketing_narrative: allLaneIds }),
      critical_path: core,
    });
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack,
      orchestration_pack_version: 1,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.timeline.dependencies.length).toBe(ORCHESTRATION_TIMELINE_POLICY.maxDependencyRows);
    const again = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(again.status).toBe('ok');
    if (again.status !== 'ok') return;
    expect(again.timeline.dependencies).toEqual(out.timeline.dependencies);
  });

  it('marks cross_lane when edge spans different lanes and blocking from relation policy', async () => {
    const nodes = [
      { id: 'tech', title: 'Tech', domain: 'tech_infrastructure' as const, lane: 'tech_delivery' as const },
      { id: 'mkt', title: 'Mkt', domain: 'marketing_utp' as const, lane: 'marketing_narrative' as const },
    ];
    const pack = minimalPack({
      graph: {
        nodes,
        edges: [{ from: 'tech', to: 'mkt', relation: 'direct_blocker', weight: 1 }],
      },
      lanes: emptyLanes({ tech_delivery: ['tech'], marketing_narrative: ['mkt'] }),
      critical_path: ['tech', 'mkt'],
    });
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack,
      orchestration_pack_version: 1,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.timeline.dependencies).toEqual([
      expect.objectContaining({
        from: 'tech',
        to: 'mkt',
        cross_lane: true,
        blocking: true,
      }),
    ]);
  });

  it('slices top action windows to maxTopActionsPerWindow', async () => {
    const ids = ['a', 'b', 'c'];
    const nodes = ids.map((id) => ({
      id,
      title: id,
      domain: 'marketing_utp' as const,
      lane: 'marketing_narrative' as const,
    }));
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`);
    const pack = minimalPack({
      graph: { nodes, edges: [] },
      lanes: emptyLanes({ marketing_narrative: ids }),
      critical_path: ids,
      top_7d: many,
      top_30d: many,
    });
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack,
      orchestration_pack_version: 1,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.timeline.top_7d.length).toBe(ORCHESTRATION_TIMELINE_POLICY.maxTopActionsPerWindow);
    expect(out.timeline.top_30d.length).toBe(ORCHESTRATION_TIMELINE_POLICY.maxTopActionsPerWindow);
  });

  it('uses calendar plan_horizon partition when manifest includes dates (not list-length split)', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const nodes = ids.map((id) => ({
      id,
      title: id,
      domain: 'marketing_utp' as const,
      lane: 'marketing_narrative' as const,
      target_window_days: 20,
    }));
    const planHorizon = { start_date: '2026-01-01', end_date: '2026-03-31' };
    const listSplit = partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_90d');
    const calendarSplit = partitionCriticalPathForTimelineDisplay({
      criticalPathIds: ids,
      nodesById: new Map(nodes.map((n) => [n.id, { target_window_days: n.target_window_days }] as const)),
      seasonPreset: 'rolling_90d',
      planHorizon,
    });
    expect(calendarSplit).not.toEqual(listSplit);

    mocks.listSnapshots.mockResolvedValue({
      snapshots: [
        {
          id: SNAPSHOT_ID,
          created_at: '2026-04-01T00:00:00.000Z',
          payload: { ...baseManifest('rolling_90d'), plan_horizon: planHorizon },
        },
      ],
      error: null,
    });
    mocks.fetchSnapshot.mockImplementation(async (args: { auditId: string; snapshotId: string }) => {
      if (args.snapshotId !== SNAPSHOT_ID) return null;
      return { id: SNAPSHOT_ID, payload: { ...baseManifest('rolling_90d'), plan_horizon: planHorizon } };
    });
    const pack = minimalPack({
      graph: { nodes, edges: [] },
      lanes: emptyLanes({ marketing_narrative: ids }),
      critical_path: ids,
    });
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack,
      orchestration_pack_version: 3,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    const byId = new Map(out.timeline.seasons.map((s) => [s.id, s.node_ids] as const));
    expect(byId.get('near')).toEqual(calendarSplit.near);
    expect(byId.get('mid')).toEqual(calendarSplit.mid);
    expect(byId.get('far')).toEqual(calendarSplit.far);
    expect(out.timeline.version.plan_horizon).toEqual(planHorizon);
  });

  it('missing_pack still returns seasons scaffold and season_preset from latest snapshot', async () => {
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack: null,
      orchestration_pack_version: 0,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.timeline.status).toBe('missing_pack');
    expect(out.timeline.version.season_preset).toBe('rolling_90d');
    expect(out.timeline.seasons.map((s) => s.id)).toEqual(['near', 'mid', 'far']);
    expect(out.timeline.seasons.every((s) => s.node_ids.length === 0)).toBe(true);
  });

  it('missing_pack surfaces plan_horizon from latest manifest when present', async () => {
    const ph = { start_date: '2026-02-01', end_date: '2026-08-01' };
    mocks.listSnapshots.mockResolvedValue({
      snapshots: [
        {
          id: SNAPSHOT_ID,
          created_at: '2026-04-01T00:00:00.000Z',
          payload: { ...baseManifest('rolling_90d'), plan_horizon: ph },
        },
      ],
      error: null,
    });
    mocks.fetchPersisted.mockResolvedValue({
      status: 'ok',
      pack: null,
      orchestration_pack_version: 0,
      last_revision_diff: null,
      revision_history: [],
    });
    const out = await buildClientTimelineReadModel({ auditId: AUDIT_ID, userId: USER_ID });
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.timeline.version.plan_horizon).toEqual(ph);
  });
});
