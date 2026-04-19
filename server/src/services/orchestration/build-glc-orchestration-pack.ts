import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-graph-policy.js';
import type { StrategyInitiative } from '../../schemas/domain-output.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import { dedupeOrchestrationActionNodesByPolicy } from './dedupe-orchestration-action-nodes.js';
import { buildOrchestrationGraph } from './orchestration-graph-builder.js';
import { mapStrategyInitiativesToActionNodes } from './map-strategy-initiative-to-action-node.js';

/**
 * Deterministic pack from finalized strategy initiatives + confirmed manifest snapshot id.
 * Optional LLM synthesis runs in `runOrchestrationSynthesisIfEnabled` after this (async).
 */
export function buildGlcOrchestrationPackFromInitiatives(args: {
  initiatives: StrategyInitiative[];
  manifestSnapshotId: string;
}): GlcOrchestrationPack {
  const { nodes: mapped, conflicts_resolved: capConflicts } = mapStrategyInitiativesToActionNodes(args.initiatives);
  const { nodes: deduped, conflicts_resolved: dupConflicts } = dedupeOrchestrationActionNodesByPolicy(mapped);
  const built = buildOrchestrationGraph(deduped);
  const raw = {
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: built.graph,
    lanes: built.lanes,
    critical_path: built.critical_path,
    conflicts_resolved: [...capConflicts, ...dupConflicts, ...built.conflicts_resolved],
    manifest_snapshot_id: args.manifestSnapshotId,
  };
  return GlcOrchestrationPackSchema.parse(raw);
}
