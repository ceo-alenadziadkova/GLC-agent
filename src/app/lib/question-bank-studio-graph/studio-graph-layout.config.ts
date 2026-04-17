/** Dagre node box sizes (fixed node kinds; question size comes from density). */
export const STUDIO_GRAPH_ROOT_ID = 'qbs-root';

export const STUDIO_GRAPH_NODE_DIM = {
  root: { w: 200, h: 40 },
  section: { w: 220, h: 44 },
  layoutStep: { w: 210, h: 48 },
  domainCluster: { w: 220, h: 44 },
  identity: { w: 240, h: 52 },
} as const;

export const STUDIO_GRAPH_DAGRE = {
  nodesep: 28,
  ranksep: 72,
  marginx: 20,
  marginy: 20,
} as const;

/** Truncate labels for node chrome (full text still in fullLabel where applicable). */
export const STUDIO_GRAPH_LABEL_TRUNCATE = {
  questionDefault: 48,
  layoutStep: 40,
} as const;

export function getStudioQuestionNodeDimensions(
  viewDensity?: 'comfortable' | 'compact',
): { w: number; h: number } {
  switch (viewDensity ?? 'comfortable') {
    case 'compact':
      return { w: 240, h: 70 };
    case 'comfortable':
    default:
      return { w: 280, h: 82 };
  }
}
