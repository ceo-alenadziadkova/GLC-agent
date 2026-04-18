import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import { STUDIO_GRAPH_DAGRE } from './studio-graph-layout.config';
import { getStudioNodeLayoutDimensions } from './node-dimensions';
import type { StudioAnyNodeData } from './types';

export function applyDagreLayoutStudioGraph(
  nodes: Node<StudioAnyNodeData>[],
  edges: Edge[],
  opts: {
    orientation?: 'TB' | 'LR';
    questionBox: { w: number; h: number };
  },
): Node<StudioAnyNodeData>[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: opts.orientation ?? 'TB',
    nodesep: STUDIO_GRAPH_DAGRE.nodesep,
    ranksep: STUDIO_GRAPH_DAGRE.ranksep,
    marginx: STUDIO_GRAPH_DAGRE.marginx,
    marginy: STUDIO_GRAPH_DAGRE.marginy,
  });

  for (const n of nodes) {
    const dim = getStudioNodeLayoutDimensions(n, opts.questionBox);
    dagreGraph.setNode(n.id, { width: dim.w, height: dim.h });
  }
  for (const e of edges) {
    dagreGraph.setEdge(e.source, e.target);
  }
  dagre.layout(dagreGraph);

  return nodes.map(n => {
    const nodeWithPosition = dagreGraph.node(n.id);
    const dim = getStudioNodeLayoutDimensions(n, opts.questionBox);
    const x = nodeWithPosition.x - dim.w / 2;
    const y = nodeWithPosition.y - dim.h / 2;
    return { ...n, position: { x, y } };
  });
}
