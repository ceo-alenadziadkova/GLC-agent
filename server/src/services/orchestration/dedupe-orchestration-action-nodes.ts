import {
  ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
  ORCHESTRATION_DUPLICATE_INITIATIVE_ID_POLICY,
  type OrchestrationDuplicateInitiativeIdPolicy,
} from '../../config/orchestration-graph-policy.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
} from '../../types/orchestration/index.js';

export interface DedupeOrchestrationActionNodesResult {
  nodes: OrchestrationActionNode[];
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
}

/**
 * Ensures at most one action node per initiative `id` before graph construction.
 */
export function dedupeOrchestrationActionNodesByPolicy(
  nodes: OrchestrationActionNode[],
  policy: OrchestrationDuplicateInitiativeIdPolicy = ORCHESTRATION_DUPLICATE_INITIATIVE_ID_POLICY,
): DedupeOrchestrationActionNodesResult {
  const conflicts: OrchestrationConflictResolvedEntry[] = [];

  if (policy === 'keep_first') {
    const seen = new Set<string>();
    const out: OrchestrationActionNode[] = [];
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i]!;
      if (seen.has(n.id)) {
        conflicts.push({
          id: `dup-id-drop:${n.id}:idx${i}`,
          summary: `Duplicate initiative id "${n.id}" dropped (keep_first).`,
          resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
        });
        continue;
      }
      seen.add(n.id);
      out.push(n);
    }
    return { nodes: out, conflicts_resolved: conflicts };
  }

  // keep_last
  const lastIndexById = new Map<string, number>();
  for (let i = 0; i < nodes.length; i += 1) {
    lastIndexById.set(nodes[i]!.id, i);
  }

  const out: OrchestrationActionNode[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]!;
    if (lastIndexById.get(n.id) !== i) {
      conflicts.push({
        id: `dup-id-drop:${n.id}:${i}`,
        summary: `Duplicate initiative id "${n.id}" dropped (keep_last).`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
      continue;
    }
    out.push(n);
  }
  return { nodes: out, conflicts_resolved: conflicts };
}
