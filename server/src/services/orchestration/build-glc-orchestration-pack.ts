import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-graph-policy.js';
import {
  ROADMAP_SEASON_TARGET_WINDOW_DAYS,
  type RoadmapSeasonPreset,
} from '../../config/orchestration-roadmap-presets.js';
import type { StrategyInitiative } from '../../schemas/domain-output.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { OrchestrationActionNode, OrchestrationConflictResolvedEntry } from '../../types/orchestration/index.js';
import { dedupeOrchestrationActionNodesByPolicy } from './dedupe-orchestration-action-nodes.js';
import { buildOrchestrationGraph } from './orchestration-graph-builder.js';
import { mapStrategyInitiativesToActionNodes } from './map-strategy-initiative-to-action-node.js';

/**
 * Deterministic pack from normalized action nodes + confirmed manifest snapshot id.
 * Optional LLM synthesis runs in `runOrchestrationSynthesisIfEnabled` after this (async).
 */
export function buildGlcOrchestrationPackFromActionNodes(args: {
  nodes: OrchestrationActionNode[];
  preGraphConflicts: OrchestrationConflictResolvedEntry[];
  manifestSnapshotId: string;
  seasonPreset: RoadmapSeasonPreset;
}): GlcOrchestrationPack {
  const { nodes: deduped, conflicts_resolved: dupConflicts } = dedupeOrchestrationActionNodesByPolicy(args.nodes);
  const built = buildOrchestrationGraph(deduped);
  const criticalPosition = new Map<string, number>(built.critical_path.map((id, idx) => [id, idx] as const));
  const targetWindowDays = ROADMAP_SEASON_TARGET_WINDOW_DAYS[args.seasonPreset];
  const criticalLen = Math.max(1, built.critical_path.length);
  const nearCutoff = Math.ceil(criticalLen / 3);
  const midCutoff = Math.ceil((2 * criticalLen) / 3);
  const graphNodes = built.graph.nodes.map(node => {
    const index = criticalPosition.get(node.id);
    if (index === undefined) {
      return {
        ...node,
        season_index: 3,
        time_bucket: 'later' as const,
        target_window_days: targetWindowDays,
      };
    }
    const season_index = index < nearCutoff ? 1 : index < midCutoff ? 2 : 3;
    return {
      ...node,
      season_index,
      time_bucket: season_index === 1 ? ('now' as const) : season_index === 2 ? ('next' as const) : ('later' as const),
      target_window_days: targetWindowDays,
    };
  });
  const raw = {
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: { ...built.graph, nodes: graphNodes },
    lanes: built.lanes,
    critical_path: built.critical_path,
    conflicts_resolved: [...args.preGraphConflicts, ...dupConflicts, ...built.conflicts_resolved],
    manifest_snapshot_id: args.manifestSnapshotId,
    phase_diagnostic: built.phase_diagnostic,
    routing_profile: built.routing_profile,
    execution_mode: built.execution_mode,
    confidence_map: built.confidence_map,
    risk_layer: built.risk_layer,
    domain_influence: built.domain_influence,
  };
  return GlcOrchestrationPackSchema.parse(raw);
}

/**
 * Deterministic pack from finalized strategy initiatives only (no director slices).
 * Prefer `buildGlcOrchestrationPackFromActionNodes` when merging director input.
 */
export function buildGlcOrchestrationPackFromInitiatives(args: {
  initiatives: StrategyInitiative[];
  manifestSnapshotId: string;
  seasonPreset: RoadmapSeasonPreset;
}): GlcOrchestrationPack {
  const { nodes: mapped, conflicts_resolved: capConflicts } = mapStrategyInitiativesToActionNodes(args.initiatives);
  return buildGlcOrchestrationPackFromActionNodes({
    nodes: mapped,
    preGraphConflicts: capConflicts,
    manifestSnapshotId: args.manifestSnapshotId,
    seasonPreset: args.seasonPreset,
  });
}
