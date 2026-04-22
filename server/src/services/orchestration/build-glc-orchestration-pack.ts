import {
  GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_DEFAULT_INPUT_QUALITY,
  ORCHESTRATION_TOP_ACTIONS_POLICY,
} from '../../config/orchestration-graph-policy.js';
import {
  ROADMAP_SEASON_TARGET_WINDOW_DAYS,
  type RoadmapSeasonPreset,
} from '../../config/orchestration-roadmap-presets.js';
import type { StrategyInitiative } from '../../schemas/domain-output.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import { OrchestrationActionNodeListSchema } from '../../schemas/orchestration-action-node.js';
import type { OrchestrationActionNode, OrchestrationConflictResolvedEntry } from '../../types/orchestration/index.js';
import { dedupeOrchestrationActionNodesByPolicy } from './dedupe-orchestration-action-nodes.js';
import { buildOrchestrationGraph } from './orchestration-graph-builder.js';
import { mapStrategyInitiativesToActionNodes } from './map-strategy-initiative-to-action-node.js';

function buildTopActionsByWindow(args: {
  graphNodes: Array<{ id: string; season_index?: number; priority_score?: number }>;
}): { top_actions_7d: string[]; top_actions_30d: string[] } {
  const sorted = [...args.graphNodes].sort((a, b) => {
    const scoreA = a.priority_score ?? 0;
    const scoreB = b.priority_score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });
  const limit = ORCHESTRATION_TOP_ACTIONS_POLICY.per_window_limit;
  const top_actions_7d = sorted
    .filter((node) => (node.season_index ?? 3) <= 1)
    .slice(0, limit)
    .map((node) => node.id);
  const top_actions_30d = sorted
    .filter((node) => (node.season_index ?? 3) <= 2)
    .slice(0, limit)
    .map((node) => node.id);
  return { top_actions_7d, top_actions_30d };
}

function buildDataGaps(args: {
  graphNodes: Array<{ id: string }>;
  conflictsResolved: Array<{ id: string }>;
  confidenceMap: Record<string, 'high' | 'medium' | 'low'>;
  riskLayer: Record<string, number>;
  inputQuality: {
    degraded: boolean;
    fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
  };
}): {
  degraded_input: boolean;
  fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
  dangling_dependencies: number;
  missing_confidence: number;
  missing_risk: number;
} {
  const dangling_dependencies = args.conflictsResolved.filter((row) => row.id.startsWith('orphan-dep:')).length;
  const missing_confidence = args.graphNodes.filter((node) => args.confidenceMap[node.id] === undefined).length;
  const missing_risk = args.graphNodes.filter((node) => args.riskLayer[node.id] === undefined).length;
  return {
    degraded_input: args.inputQuality.degraded,
    fallback_reason_code: args.inputQuality.fallback_reason_code,
    dangling_dependencies,
    missing_confidence,
    missing_risk,
  };
}

function resolveInputQualityWithGate(args: {
  inputQuality: {
    input_mode: 'director_enriched' | 'strategy_fallback';
    director_coverage_ratio: number;
    director_input_coverage_ratio: number;
    degraded: boolean;
    fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
  };
}): {
  input_mode: 'director_enriched' | 'strategy_fallback';
  input_gate_status: 'finalized' | 'degraded';
  director_coverage_ratio: number;
  director_input_coverage_ratio: number;
  degraded: boolean;
  fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
} {
  /** No director slices by design (e.g. FEATURE_DIRECTOR_ORCHESTRATION_AGENT_OUTPUT off) — not a "degraded" gate. */
  const expectedStrategyOnly =
    args.inputQuality.input_mode === 'strategy_fallback' &&
    args.inputQuality.fallback_reason_code === 'director_slice_missing';
  return {
    ...args.inputQuality,
    input_gate_status: expectedStrategyOnly || !args.inputQuality.degraded ? 'finalized' : 'degraded',
  };
}

/**
 * Deterministic pack from normalized action nodes + confirmed manifest snapshot id.
 * Optional LLM synthesis runs in `runOrchestrationSynthesisIfEnabled` after this (async).
 */
export function buildGlcOrchestrationPackFromActionNodes(args: {
  nodes: OrchestrationActionNode[];
  preGraphConflicts: OrchestrationConflictResolvedEntry[];
  manifestSnapshotId: string;
  seasonPreset: RoadmapSeasonPreset;
  inputQuality?: {
    input_mode: 'director_enriched' | 'strategy_fallback';
    director_coverage_ratio: number;
    director_input_coverage_ratio: number;
    degraded: boolean;
    fallback_reason_code?: 'director_slice_missing' | 'director_slice_partial' | 'director_slice_invalid';
  };
}): GlcOrchestrationPack {
  const runtimeValidatedNodes = OrchestrationActionNodeListSchema.parse(args.nodes);
  const { nodes: deduped, conflicts_resolved: dupConflicts } =
    dedupeOrchestrationActionNodesByPolicy(runtimeValidatedNodes);
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
  const top_actions = buildTopActionsByWindow({ graphNodes });
  const input_quality = resolveInputQualityWithGate({
    inputQuality: args.inputQuality ?? ORCHESTRATION_DEFAULT_INPUT_QUALITY,
  });
  const data_gaps = buildDataGaps({
    graphNodes,
    conflictsResolved: [...args.preGraphConflicts, ...dupConflicts, ...built.conflicts_resolved],
    confidenceMap: built.confidence_map.node_confidence,
    riskLayer: built.risk_layer.node_risk,
    inputQuality: input_quality,
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
    input_quality,
    system_diagnosis: built.phase_diagnostic,
    top_7d: top_actions.top_actions_7d,
    top_30d: top_actions.top_actions_30d,
    data_gaps,
    top_actions,
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
    inputQuality: ORCHESTRATION_DEFAULT_INPUT_QUALITY,
  });
}
