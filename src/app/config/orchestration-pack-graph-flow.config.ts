/**
 * Layout policy for portal timeline pack graph (React Flow + Dagre).
 * Visual caps for the interactive canvas live in `orchestration-ui-limits.ts`.
 */
export const ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT = {
  nodeWidthPx: 200,
  nodeHeightPx: 64,
  titleMaxChars: 48,
  dagre: {
    rankdir: 'LR' as const,
    nodesep: 28,
    ranksep: 72,
    marginx: 20,
    marginy: 20,
  },
} as const;

/** Camera when focusing a node from the list or graph (after fitView on layout change). */
export const ORCHESTRATION_PACK_GRAPH_FLOW_CAMERA = {
  centerOnSelectZoom: 1.12,
  centerOnSelectDurationMs: 280,
} as const;

/** Viewport clamps and fitView defaults for React Flow (portal pack graph). */
export const ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT = {
  minZoom: 0.2,
  maxZoom: 1.75,
  fitViewMaxZoom: 1.25,
  fitViewEdgePairMaxZoom: 1.35,
  fitViewPadding: 0.2,
  fitViewEdgePairPadding: 0.28,
  fitViewAnimationDurationMs: 200,
} as const;
