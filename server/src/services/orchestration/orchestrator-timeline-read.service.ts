import type { DomainKey } from '@glc/intake-core';
import type { OrchestrationManifestState } from '../../config/orchestration-client-contract.js';
import type { RoadmapSeasonPreset } from '../../config/orchestration-roadmap-presets.js';
import {
  ORCHESTRATION_TIMELINE_POLICY,
  partitionCriticalPathForTimelineDisplay,
} from '../../config/orchestration-timeline-policy.js';
import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';
import { OrchestratorTimelineDtoSchema, type OrchestratorTimelineDto } from '../../schemas/orchestrator-timeline.js';
import { fetchPersistedGlcOrchestrationPackForUser, loadAuditExecutionPlanRow } from './orchestration-read.service.js';
import { buildRoadmapManifestPreview } from './roadmap-manifest-preview.js';
import {
  fetchRoadmapManifestSnapshotForAudit,
  listRoadmapManifestSnapshotsForAudit,
} from './roadmap-manifest.service.js';
import { ORCHESTRATION_LANE_IDS } from '../../config/orchestration-lanes.js';

type TimelineReadResult =
  | { status: 'not_found' }
  | { status: 'error'; error: Error }
  | { status: 'ok'; timeline: OrchestratorTimelineDto };

const TIMELINE_BUCKET_IDS = ['near', 'mid', 'far'] as const;

async function resolveManifestForTimelinePartition(args: {
  auditId: string;
  packManifestSnapshotId: string | null;
  latestSnapshotPayload: RoadmapManifestPayload | null;
}): Promise<{
  seasonPreset: RoadmapSeasonPreset | null;
  planHorizon: RoadmapManifestPayload['plan_horizon'] | null;
}> {
  if (args.packManifestSnapshotId) {
    const row = await fetchRoadmapManifestSnapshotForAudit({
      auditId: args.auditId,
      snapshotId: args.packManifestSnapshotId,
    });
    if (row?.payload) {
      return {
        seasonPreset: row.payload.season_preset ?? null,
        planHorizon: row.payload.plan_horizon ?? null,
      };
    }
  }
  const latest = args.latestSnapshotPayload;
  return {
    seasonPreset: latest?.season_preset ?? null,
    planHorizon: latest?.plan_horizon ?? null,
  };
}

/**
 * Timeline read model for `GET /api/audits/:id/timeline`.
 * Authorization: `userId` must own the audit (enforced in `fetchPersistedGlcOrchestrationPackForUser`).
 * Clients should set `restrictedClientView` so missing-pack states do not leak consultant-only manifest detail.
 */
export async function buildClientTimelineReadModel(args: {
  auditId: string;
  userId: string;
  restrictedClientView?: boolean;
}): Promise<TimelineReadResult> {
  const persisted = await fetchPersistedGlcOrchestrationPackForUser({
    auditId: args.auditId,
    userId: args.userId,
  });
  if (persisted.status !== 'ok') return persisted;

  const executionPlanRow = await loadAuditExecutionPlanRow(args.auditId, args.userId);
  if (!executionPlanRow) return { status: 'not_found' };

  const latestSnapshotRes = await listRoadmapManifestSnapshotsForAudit({
    auditId: args.auditId,
    limit: ORCHESTRATION_TIMELINE_POLICY.latestManifestSnapshotsPeekLimit,
  });
  if (latestSnapshotRes.error) {
    return { status: 'error', error: latestSnapshotRes.error };
  }
  const latestSnapshot = latestSnapshotRes.snapshots[0] ?? null;
  const latestSnapshotId = latestSnapshot?.id ?? null;
  const latestPayload = latestSnapshot?.payload ?? null;
  const waiting_list_domains = latestSnapshot
    ? (buildRoadmapManifestPreview({
        executionPlan: executionPlanRow.plan,
        manifest: latestSnapshot.payload,
      }).waiting_list_domains as DomainKey[])
    : [];

  const roadmapVersion = persisted.orchestration_pack_version;
  const pack = persisted.pack;
  const manifestSnapshotId = pack?.manifest_snapshot_id ?? null;
  const staleManifest =
    ORCHESTRATION_TIMELINE_POLICY.staleManifestStatusEnabled &&
    !!manifestSnapshotId &&
    !!latestSnapshotId &&
    manifestSnapshotId !== latestSnapshotId;
  const manifestState: OrchestrationManifestState = !manifestSnapshotId
    ? 'draft'
    : staleManifest
      ? 'stale'
      : 'confirmed';

  if (!pack) {
    const versionManifest = await resolveManifestForTimelinePartition({
      auditId: args.auditId,
      packManifestSnapshotId: null,
      latestSnapshotPayload: latestPayload,
    });
    const missingDto = OrchestratorTimelineDtoSchema.parse({
      status: args.restrictedClientView ? 'restricted_client_view' : 'missing_pack',
      version: {
        roadmap_version: roadmapVersion,
        manifest_snapshot_id: null,
        latest_manifest_snapshot_id: latestSnapshotId,
        stale_manifest: false,
        manifest_state: 'draft',
        season_preset: versionManifest.seasonPreset,
        plan_horizon: versionManifest.planHorizon,
      },
      seasons: TIMELINE_BUCKET_IDS.map((id) => ({ id, node_ids: [] })),
      lanes: ORCHESTRATION_LANE_IDS.map((lane_id) => ({ lane_id, items: [] })),
      dependencies: [],
      top_7d: [],
      top_30d: [],
      waiting_list_domains,
      data_gaps: null,
    });
    return { status: 'ok', timeline: missingDto };
  }

  const nodeById = new Map(pack.graph.nodes.map((node) => [node.id, node] as const));
  const versionManifest = await resolveManifestForTimelinePartition({
    auditId: args.auditId,
    packManifestSnapshotId: manifestSnapshotId,
    latestSnapshotPayload: latestPayload,
  });
  const partitionHints = new Map(
    pack.graph.nodes.map((n) => [n.id, { target_window_days: n.target_window_days }] as const),
  );
  const critical = partitionCriticalPathForTimelineDisplay({
    criticalPathIds: pack.critical_path,
    nodesById: partitionHints,
    seasonPreset: versionManifest.seasonPreset,
    planHorizon: versionManifest.planHorizon ?? null,
  });
  const lanes = ORCHESTRATION_LANE_IDS.map((lane_id) => ({
    lane_id,
    items: (pack.lanes[lane_id] ?? [])
      .map((id) => nodeById.get(id))
      .filter((row): row is NonNullable<typeof row> => !!row)
      .map((node) => ({
        id: node.id,
        title: node.title,
        domain: node.domain,
        lane: node.lane,
        season_index: node.season_index,
        time_bucket: node.time_bucket,
        analysis_depth: node.analysis_depth,
        source: node.source,
      })),
  }));

  const dependencies = pack.graph.edges
    .map((edge) => {
      const fromLane = nodeById.get(edge.from)?.lane;
      const toLane = nodeById.get(edge.to)?.lane;
      const cross_lane = !!fromLane && !!toLane && fromLane !== toLane;
      const blocking = edge.relation === 'direct_blocker' || edge.relation === 'strong';
      return {
        from: edge.from,
        to: edge.to,
        relation: edge.relation,
        cross_lane,
        blocking,
      };
    })
    .slice(0, ORCHESTRATION_TIMELINE_POLICY.maxDependencyRows);

  const top_7d = (pack.top_7d ?? pack.top_actions?.top_actions_7d ?? []).slice(
    0,
    ORCHESTRATION_TIMELINE_POLICY.maxTopActionsPerWindow,
  );
  const top_30d = (pack.top_30d ?? pack.top_actions?.top_actions_30d ?? []).slice(
    0,
    ORCHESTRATION_TIMELINE_POLICY.maxTopActionsPerWindow,
  );

  const status = args.restrictedClientView
    ? 'restricted_client_view'
    : staleManifest
      ? 'stale_manifest'
      : pack.input_quality?.degraded
        ? 'degraded'
        : 'ready';

  const dto = OrchestratorTimelineDtoSchema.parse({
    status,
    version: {
      roadmap_version: roadmapVersion,
      manifest_snapshot_id: manifestSnapshotId,
      latest_manifest_snapshot_id: latestSnapshotId,
      stale_manifest: staleManifest,
      manifest_state: manifestState,
      season_preset: versionManifest.seasonPreset,
      plan_horizon: versionManifest.planHorizon,
    },
    seasons: TIMELINE_BUCKET_IDS.map((id) => ({ id, node_ids: critical[id] })),
    lanes,
    dependencies,
    top_7d,
    top_30d,
    waiting_list_domains,
    data_gaps: pack.data_gaps ?? null,
  });
  return { status: 'ok', timeline: dto };
}

