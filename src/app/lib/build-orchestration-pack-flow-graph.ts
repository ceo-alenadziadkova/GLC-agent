import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

import { ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT } from '../config/orchestration-pack-graph-flow.config';
import type { OrchestrationLaneId } from '../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_LANE_LABELS } from '../config/orchestration-roadmap-ui-copy.en';
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { orchestrationNodeTitleMap, prioritizeCrossLaneEdges } from './orchestration-timeline-projection';

export type PortalPackGraphNodeData = {
  title: string;
  laneShortLabel: string;
  onCriticalPath: boolean;
};

const PACK_FLOW_NODE_TYPE = 'portalPackGraphNode' as const;

function truncateTitle(title: string, maxChars: number): string {
  const t = title.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1))}…`;
}

function criticalPathSuccessorSet(criticalPath: string[]): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < criticalPath.length - 1; i++) {
    s.add(`${criticalPath[i]}\0${criticalPath[i + 1]}`);
  }
  return s;
}

function laneShortLabel(lane: OrchestrationLaneId): string {
  return ORCHESTRATION_LANE_LABELS[lane];
}

/**
 * Caps nodes for the flow: always keep full critical path order, then add other endpoints until maxNodes.
 */
export function capPackFlowEdgesForNodeBudget(args: {
  pack: GlcOrchestrationPackView;
  prioritizedEdges: GlcOrchestrationPackView['graph']['edges'];
  maxNodes: number;
}): { edges: GlcOrchestrationPackView['graph']['edges']; nodesDroppedFromBudget: number } {
  const { pack, prioritizedEdges, maxNodes } = args;
  const cp = pack.critical_path;
  const allowed = new Set<string>(cp);
  const pool: string[] = [];
  const seenPool = new Set<string>();
  for (const e of prioritizedEdges) {
    for (const id of [e.from, e.to]) {
      if (!allowed.has(id) && !seenPool.has(id)) {
        seenPool.add(id);
        pool.push(id);
      }
    }
  }
  while (allowed.size < maxNodes && pool.length > 0) {
    const next = pool.shift();
    if (next) allowed.add(next);
  }
  const filtered = prioritizedEdges.filter(e => allowed.has(e.from) && allowed.has(e.to));
  const nodesInFull = new Set<string>();
  for (const e of prioritizedEdges) {
    nodesInFull.add(e.from);
    nodesInFull.add(e.to);
  }
  for (const id of cp) nodesInFull.add(id);
  const nodesInFiltered = new Set<string>();
  for (const e of filtered) {
    nodesInFiltered.add(e.from);
    nodesInFiltered.add(e.to);
  }
  for (const id of cp) nodesInFiltered.add(id);
  return {
    edges: filtered,
    nodesDroppedFromBudget: Math.max(0, nodesInFull.size - nodesInFiltered.size),
  };
}

function applyDagreLayout(
  nodes: Node<PortalPackGraphNodeData>[],
  edges: Edge[],
  layout: typeof ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT,
): Node<PortalPackGraphNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: layout.dagre.rankdir,
    nodesep: layout.dagre.nodesep,
    ranksep: layout.dagre.ranksep,
    marginx: layout.dagre.marginx,
    marginy: layout.dagre.marginy,
  });
  for (const n of nodes) {
    g.setNode(n.id, { width: layout.nodeWidthPx, height: layout.nodeHeightPx });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }
  dagre.layout(g);
  return nodes.map(n => {
    const pos = g.node(n.id);
    const x = pos.x - layout.nodeWidthPx / 2;
    const y = pos.y - layout.nodeHeightPx / 2;
    return { ...n, position: { x, y } };
  });
}

export interface BuildOrchestrationPackFlowGraphResult {
  nodes: Node<PortalPackGraphNodeData>[];
  edges: Edge[];
  flowEdgesTruncated: boolean;
  nodesDroppedFromBudget: number;
}

/**
 * Builds a positioned React Flow model for the portal pack graph (deterministic Dagre LR).
 */
export function buildOrchestrationPackFlowGraph(
  pack: GlcOrchestrationPackView,
  opts: {
    maxFlowEdges: number;
    maxFlowNodes: number;
  },
): BuildOrchestrationPackFlowGraphResult {
  const titleMap = orchestrationNodeTitleMap(pack);
  const laneById = new Map<string, OrchestrationLaneId>();
  for (const n of pack.graph.nodes) {
    laneById.set(n.id, n.lane);
  }
  const prioritized = prioritizeCrossLaneEdges(pack);
  const flowEdgesTruncated = prioritized.length > opts.maxFlowEdges;
  const edgeSlice = prioritized.slice(0, Math.max(0, opts.maxFlowEdges));
  const { edges: cappedEdges, nodesDroppedFromBudget } = capPackFlowEdgesForNodeBudget({
    pack,
    prioritizedEdges: edgeSlice,
    maxNodes: opts.maxFlowNodes,
  });
  const cpSet = new Set(pack.critical_path);
  const cpEdgeKeys = criticalPathSuccessorSet(pack.critical_path);

  const nodeIds = new Set<string>();
  for (const id of pack.critical_path) nodeIds.add(id);
  for (const e of cappedEdges) {
    nodeIds.add(e.from);
    nodeIds.add(e.to);
  }

  const nodesBase: Node<PortalPackGraphNodeData>[] = [...nodeIds].map(id => {
    const lane = laneById.get(id) ?? 'product_change';
    return {
      id,
      type: PACK_FLOW_NODE_TYPE,
      position: { x: 0, y: 0 },
      data: {
        title: truncateTitle(titleMap.get(id) ?? id, ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT.titleMaxChars),
        laneShortLabel: laneShortLabel(lane),
        onCriticalPath: cpSet.has(id),
      },
    };
  });

  const edges: Edge[] = cappedEdges.map((e, i) => {
    const onCp = cpEdgeKeys.has(`${e.from}\0${e.to}`);
    return {
      id: `e-${e.from}-${e.to}-${i}`,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      animated: false,
      className: onCp ? 'ds-portal-pack-graph-edge--critical' : 'ds-portal-pack-graph-edge--default',
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    };
  });

  const nodes =
    nodesBase.length === 0 ? [] : applyDagreLayout(nodesBase, edges, ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT);

  return {
    nodes,
    edges,
    flowEdgesTruncated,
    nodesDroppedFromBudget,
  };
}

export const PORTAL_PACK_GRAPH_FLOW_NODE_TYPE = PACK_FLOW_NODE_TYPE;
