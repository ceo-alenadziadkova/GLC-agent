import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import {
  GlcOrchestrationPackRevisionDiffSchema,
  type GlcOrchestrationPackRevisionDiff,
} from '../../schemas/orchestration-pack-revision-diff.js';

function edgeKey(e: { from: string; to: string }): string {
  return JSON.stringify([e.from, e.to]);
}

function nodeById(pack: GlcOrchestrationPack): Map<string, (typeof pack.graph.nodes)[number]> {
  const m = new Map<string, (typeof pack.graph.nodes)[number]>();
  for (const n of pack.graph.nodes) {
    m.set(n.id, n);
  }
  return m;
}

function edgeSet(pack: GlcOrchestrationPack): Set<string> {
  const s = new Set<string>();
  for (const e of pack.graph.edges) {
    s.add(edgeKey(e));
  }
  return s;
}

function criticalPathKey(path: string[]): string {
  return path.join('\t');
}

function jsonStableKey(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/**
 * Structural diff between two persisted orchestration packs (same audit, sequential versions).
 */
export function buildOrchestrationPackRevisionDiff(args: {
  previous: GlcOrchestrationPack | null;
  next: GlcOrchestrationPack;
  fromVersion: number;
  toVersion: number;
}): GlcOrchestrationPackRevisionDiff {
  const { previous, next, fromVersion, toVersion } = args;
  const prevIds = previous ? new Set(previous.graph.nodes.map(n => n.id)) : new Set<string>();
  const nextIds = new Set(next.graph.nodes.map(n => n.id));

  const nodes_added: string[] = [];
  const nodes_removed: string[] = [];
  for (const id of nextIds) {
    if (!prevIds.has(id)) nodes_added.push(id);
  }
  for (const id of prevIds) {
    if (!nextIds.has(id)) nodes_removed.push(id);
  }

  const prevNodes = previous ? nodeById(previous) : new Map();
  const nextNodes = nodeById(next);
  const nodes_lane_changed: GlcOrchestrationPackRevisionDiff['nodes_lane_changed'] = [];
  for (const id of nextIds) {
    if (!prevIds.has(id)) continue;
    const pn = prevNodes.get(id);
    const nn = nextNodes.get(id);
    if (pn && nn && pn.lane !== nn.lane) {
      nodes_lane_changed.push({ id, from_lane: pn.lane, to_lane: nn.lane });
    }
  }

  const prevEdgeKeys = previous ? edgeSet(previous) : new Set<string>();
  const nextEdgeKeys = edgeSet(next);
  const edges_added: GlcOrchestrationPackRevisionDiff['edges_added'] = [];
  const edges_removed: GlcOrchestrationPackRevisionDiff['edges_removed'] = [];
  for (const e of next.graph.edges) {
    if (!prevEdgeKeys.has(edgeKey(e))) {
      edges_added.push({ from: e.from, to: e.to });
    }
  }
  if (previous) {
    for (const e of previous.graph.edges) {
      if (!nextEdgeKeys.has(edgeKey(e))) {
        edges_removed.push({ from: e.from, to: e.to });
      }
    }
  }

  const critical_path_changed =
    !previous ||
    criticalPathKey(previous.critical_path) !== criticalPathKey(next.critical_path);
  const execution_mode_changed = !previous || previous.execution_mode !== next.execution_mode;
  const confidence_map_changed =
    !previous || jsonStableKey(previous.confidence_map) !== jsonStableKey(next.confidence_map);
  const risk_layer_changed = !previous || jsonStableKey(previous.risk_layer) !== jsonStableKey(next.risk_layer);
  const domain_influence_changed =
    !previous || jsonStableKey(previous.domain_influence) !== jsonStableKey(next.domain_influence);

  const conflicts_resolved_before = previous?.conflicts_resolved?.length ?? 0;
  const conflicts_resolved_after = next.conflicts_resolved.length;

  const raw = {
    from_version: fromVersion,
    to_version: toVersion,
    nodes_added,
    nodes_removed,
    nodes_lane_changed,
    edges_added,
    edges_removed,
    critical_path_changed,
    execution_mode_changed,
    confidence_map_changed,
    risk_layer_changed,
    domain_influence_changed,
    conflicts_resolved_before,
    conflicts_resolved_after,
  };
  return GlcOrchestrationPackRevisionDiffSchema.parse(raw);
}

/**
 * Human-readable summary for UI copy and activity feeds.
 */
export function summarizeOrchestrationPackRevisionDiff(
  diff: GlcOrchestrationPackRevisionDiff | null,
): string | null {
  if (!diff) return null;
  const nodesAdded = Array.isArray((diff as { nodes_added?: unknown }).nodes_added)
    ? diff.nodes_added.length
    : 0;
  const nodesRemoved = Array.isArray((diff as { nodes_removed?: unknown }).nodes_removed)
    ? diff.nodes_removed.length
    : 0;
  const laneChanges = Array.isArray((diff as { nodes_lane_changed?: unknown }).nodes_lane_changed)
    ? diff.nodes_lane_changed.length
    : 0;
  const edgesAdded = Array.isArray((diff as { edges_added?: unknown }).edges_added)
    ? diff.edges_added.length
    : 0;
  const edgesRemoved = Array.isArray((diff as { edges_removed?: unknown }).edges_removed)
    ? diff.edges_removed.length
    : 0;
  const parts: string[] = [];
  if (nodesAdded > 0) parts.push(`+${nodesAdded} initiatives`);
  if (nodesRemoved > 0) parts.push(`-${nodesRemoved} initiatives`);
  if (laneChanges > 0) parts.push(`${laneChanges} lane changes`);
  if (edgesAdded > 0 || edgesRemoved > 0) {
    parts.push(`deps +${edgesAdded}/-${edgesRemoved}`);
  }
  if (diff.critical_path_changed) parts.push('critical path updated');
  if (diff.execution_mode_changed) parts.push('execution mode updated');
  if (diff.confidence_map_changed) parts.push('confidence model updated');
  if (diff.risk_layer_changed) parts.push('risk layer updated');
  if (diff.domain_influence_changed) parts.push('domain influence updated');
  if (diff.conflicts_resolved_before !== diff.conflicts_resolved_after) {
    parts.push(`conflicts ${diff.conflicts_resolved_before} -> ${diff.conflicts_resolved_after}`);
  }
  if (parts.length === 0) return `No structural changes (v${diff.from_version} -> v${diff.to_version})`;
  return `v${diff.from_version} -> v${diff.to_version}: ${parts.join(', ')}`;
}
