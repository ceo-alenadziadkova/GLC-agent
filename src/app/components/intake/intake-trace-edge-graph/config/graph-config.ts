import type { GraphPreferencesState } from '../types';

export const INTAKE_TRACE_GRAPH_CONFIG = {
  layout: {
    nodeWidth: 220,
    nodeHeight: 62,
    hGap: 70,
    vGap: 22,
    marginX: 24,
    marginY: 28,
    curveBendFactor: 0.55,
    focusScrollOffsetX: 40,
    focusScrollOffsetY: 70,
  },
  labels: {
    maxNodeLabelLength: 42,
  },
  prefs: {
    storageKey: 'intake_trace_edge_graph_ui_prefs_v1',
    downstreamDepth: { min: 0, max: 4, defaultValue: 2 },
    defaultState: {
      pathOnlyMode: false,
      downstreamDepth: 2,
      searchQuery: '',
      showBeforeAfter: true,
      baReviewMode: false,
      highOnly: false,
      scoringMode: 'normal',
    } satisfies GraphPreferencesState,
  },
  export: {
    svgNamePrefix: 'intake-branch-graph',
    markdownFilename: 'intake-wording-ba-review.md',
    fallbackRoute: '/admin/intake-wording',
  },
} as const;

