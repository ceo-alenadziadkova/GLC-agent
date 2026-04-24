import {
  ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
  ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS,
  ORCHESTRATION_EXECUTION_MODES,
  ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH,
  ORCHESTRATION_GRAPH_MAX_NODES,
} from '../../config/orchestration-graph-policy.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
  OrchestrationDomainInfluence,
  OrchestrationGraphEdge,
  OrchestrationGraphPayload,
  OrchestrationPhaseDiagnostic,
  OrchestrationRoutingProfile,
  OrchestrationRiskLayer,
  OrchestrationConfidenceMap,
} from '../../types/orchestration/index.js';
import { buildOrchestrationPhaseRouting } from './orchestration-phase-routing.js';
import { computeOrchestrationPriorityScore } from './orchestration-priority-engine.js';
import { projectOrchestrationLanes } from './orchestration-lane-projection.js';

export interface OrchestrationGraphBuildResult {
  graph: OrchestrationGraphPayload;
  lanes: GlcOrchestrationPack['lanes'];
  critical_path: string[];
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
  phase_diagnostic: OrchestrationPhaseDiagnostic;
  routing_profile: OrchestrationRoutingProfile;
  execution_mode: (typeof ORCHESTRATION_EXECUTION_MODES)[number];
  confidence_map: OrchestrationConfidenceMap;
  risk_layer: OrchestrationRiskLayer;
  domain_influence: OrchestrationDomainInfluence;
}

/**
 * Builds a DAG from action nodes (dependency -> dependent edges), breaks cycles deterministically,
 * then computes a longest-path style critical ordering.
 */
export function buildOrchestrationGraph(nodes: OrchestrationActionNode[]): OrchestrationGraphBuildResult {
  const conflictsResolved: OrchestrationConflictResolvedEntry[] = [];
  const outgoingDeps = new Map<string, number>();
  for (const node of nodes) outgoingDeps.set(node.id, 0);
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (outgoingDeps.has(dep)) {
        outgoingDeps.set(dep, (outgoingDeps.get(dep) ?? 0) + 1);
      }
    }
  }
  const { phase_diagnostic, routing_profile, domain_influence } = buildOrchestrationPhaseRouting(nodes);
  const priorityScores = new Map<string, number>();
  const nodesScored = nodes.map(node => {
    const blocking_factor = Math.min(3, Math.max(0, outgoingDeps.get(node.id) ?? 0)) as 0 | 1 | 2 | 3;
    const domain_weight = routing_profile.domain_weights[node.domain] ?? 1;
    const priority_score = computeOrchestrationPriorityScore({
      ...node,
      blocking_factor,
      domain_weight,
    });
    priorityScores.set(node.id, priority_score);
    return {
      ...node,
      blocking_factor,
      domain_weight,
      priority_score,
      weight: Math.max(node.weight, priority_score, 0.000001),
    };
  });
  const idSet = new Set(nodes.map(n => n.id));
  const nodeById = new Map(nodesScored.map(n => [n.id, n] as const));
  const edges: OrchestrationGraphEdge[] = [];
  const droppedEdges: OrchestrationGraphEdge[] = [];
  let cyclesBroken = 0;

  for (const node of nodesScored) {
    for (const dep of node.dependencies) {
      if (!idSet.has(dep)) {
        conflictsResolved.push({
          id: `orphan-dep:${node.id}:${dep}`,
          summary: `Dependency "${dep}" is not a known initiative; ignored for graph edge.`,
          resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
        });
        continue;
      }
      const sourceNode = nodeById.get(dep);
      const relation =
        sourceNode?.domain === node.domain
          ? 'direct_blocker'
          : sourceNode?.lane === node.lane
            ? 'strong'
            : sourceNode?.source === 'director' || node.source === 'director'
              ? 'medium'
              : 'weak';
      edges.push({
        from: dep,
        to: node.id,
        relation,
        weight: ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS[relation],
      });
    }
  }

  let workingEdges = edges;
  // Iteratively strip one edge from each detected cycle until acyclic.
  for (let guard = 0; guard < ORCHESTRATION_GRAPH_MAX_NODES; guard += 1) {
    const cycleEdge = findOneCycleEdge(nodes.map(n => n.id), workingEdges);
    if (!cycleEdge) break;
    workingEdges = workingEdges.filter(e => !(e.from === cycleEdge.from && e.to === cycleEdge.to));
    droppedEdges.push(cycleEdge);
    cyclesBroken += 1;
    conflictsResolved.push({
      id: `cycle-break:${cycleEdge.from}->${cycleEdge.to}`,
      summary: `Removed edge ${cycleEdge.from} -> ${cycleEdge.to} to break a dependency cycle.`,
      resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
    });
  }

  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of idSet) {
    adj.set(id, []);
    indeg.set(id, 0);
  }
  for (const e of workingEdges) {
    adj.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const topo: string[] = [];
  const queue = [...idSet].filter(id => (indeg.get(id) ?? 0) === 0);
  queue.sort();
  while (queue.length) {
    const u = queue.shift()!;
    topo.push(u);
    for (const v of adj.get(u) ?? []) {
      const next = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, next);
      if (next === 0) {
        queue.push(v);
        queue.sort();
      }
    }
  }

  const weightMap = new Map(nodesScored.map(n => [n.id, n.weight] as const));

  // Longest path in DAG: dp[node] = max(dp[pred] + weight(node)); track predecessor for reconstruction.
  const dp = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const id of topo) {
    dp.set(id, weightMap.get(id) ?? 0);
    prev.set(id, null);
  }
  for (const id of topo) {
    for (const v of adj.get(id) ?? []) {
      const cand = (dp.get(id) ?? 0) + (weightMap.get(v) ?? 0);
      if (cand > (dp.get(v) ?? 0)) {
        dp.set(v, cand);
        prev.set(v, id);
      }
    }
  }

  let end: string | null = null;
  let best = -1;
  for (const id of idSet) {
    const score = dp.get(id) ?? 0;
    if (score > best) {
      best = score;
      end = id;
    }
  }

  const critical_path: string[] = [];
  let cur = end;
  let depth = 0;
  while (cur && depth < ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH) {
    critical_path.unshift(cur);
    cur = prev.get(cur) ?? null;
    depth += 1;
  }

  const graphNodes = nodesScored.map(n => ({
    id: n.id,
    title: n.title,
    domain: n.domain,
    lane: n.lane,
    ...(n.source !== undefined ? { source: n.source } : {}),
    ...(n.analysis_depth !== undefined ? { analysis_depth: n.analysis_depth } : {}),
    ...(n.season_index !== undefined ? { season_index: n.season_index } : {}),
    ...(n.time_bucket !== undefined ? { time_bucket: n.time_bucket } : {}),
    ...(n.target_window_days !== undefined ? { target_window_days: n.target_window_days } : {}),
    ...(n.priority_score !== undefined ? { priority_score: n.priority_score } : {}),
  }));

  const graph: OrchestrationGraphPayload = {
    nodes: graphNodes,
    edges: workingEdges,
    meta:
      cyclesBroken > 0 || droppedEdges.length > 0 || priorityScores.size > 0
        ? {
            ...(cyclesBroken > 0 || droppedEdges.length > 0
              ? { cycles_broken: cyclesBroken, dropped_edges: droppedEdges }
              : {}),
            priority_scores: Object.fromEntries(priorityScores),
          }
        : undefined,
  };

  const lanes = projectOrchestrationLanes(nodes);
  const confidence_map = buildConfidenceMap(nodesScored);
  const risk_layer = buildRiskLayer(nodesScored);

  return {
    graph,
    lanes,
    critical_path,
    conflicts_resolved: conflictsResolved,
    phase_diagnostic,
    routing_profile,
    execution_mode: 'deterministic',
    confidence_map,
    risk_layer,
    domain_influence,
  };
}

/** Returns one edge that lies on a cycle, if any (DFS coloring). */
function findOneCycleEdge(nodeIds: string[], edges: OrchestrationGraphEdge[]): OrchestrationGraphEdge | null {
  const adj = new Map<string, OrchestrationGraphEdge[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.from)?.push(e);
  }
  const color = new Map<string, 0 | 1 | 2>();
  for (const id of nodeIds) color.set(id, 0);

  function dfs(u: string): OrchestrationGraphEdge | null {
    color.set(u, 1);
    for (const e of adj.get(u) ?? []) {
      const v = e.to;
      const c = color.get(v) ?? 0;
      if (c === 1) {
        return e;
      }
      if (c === 0) {
        const hit = dfs(v);
        if (hit) return hit;
      }
    }
    color.set(u, 2);
    return null;
  }

  for (const id of [...nodeIds].sort()) {
    if ((color.get(id) ?? 0) === 0) {
      const hit = dfs(id);
      if (hit) return hit;
    }
  }
  return null;
}

function buildConfidenceMap(nodes: OrchestrationActionNode[]): OrchestrationConfidenceMap {
  const node_confidence: OrchestrationConfidenceMap['node_confidence'] = {};
  for (const node of nodes) {
    if (node.confidence) {
      node_confidence[node.id] = node.confidence;
    }
  }
  return { node_confidence };
}

function buildRiskLayer(nodes: OrchestrationActionNode[]): OrchestrationRiskLayer {
  const node_risk: OrchestrationRiskLayer['node_risk'] = {};
  for (const node of nodes) {
    if (typeof node.risk_score === 'number' && Number.isFinite(node.risk_score)) {
      node_risk[node.id] = Math.max(1, Math.min(5, Math.round(node.risk_score)));
    }
  }
  return { node_risk };
}
