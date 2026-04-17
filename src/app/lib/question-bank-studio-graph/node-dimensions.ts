import type { Node } from '@xyflow/react';
import { STUDIO_GRAPH_NODE_DIM } from './studio-graph-layout.config';
import type { StudioAnyNodeData } from './types';

export function getStudioNodeLayoutDimensions(
  node: Node<StudioAnyNodeData>,
  questionBox: { w: number; h: number },
): { w: number; h: number } {
  switch (node.type) {
    case 'studioRoot':
      return STUDIO_GRAPH_NODE_DIM.root;
    case 'studioSection':
      return STUDIO_GRAPH_NODE_DIM.section;
    case 'studioLayoutStep':
      return STUDIO_GRAPH_NODE_DIM.layoutStep;
    case 'studioDomainCluster':
      return STUDIO_GRAPH_NODE_DIM.domainCluster;
    case 'studioIdentity':
      return STUDIO_GRAPH_NODE_DIM.identity;
    case 'studioQuestion':
    default:
      return questionBox;
  }
}
