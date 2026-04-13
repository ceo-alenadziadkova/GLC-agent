/**
 * Semantic UI colors for inline styles where Tailwind arbitrary values would duplicate hex.
 * Prefer CSS variables for layout theming; use this module for status / state colors shared across pages.
 */

export const UI_SEMANTIC_COLORS = {
  danger: '#EF4444',
  /** Stronger red for small text on pale backgrounds (e.g. status chips). */
  dangerFgStrong: '#b91c1c',
  dangerBgPale: '#fee2e2',
  dangerMutedBg: 'rgba(239,68,68,0.08)',
  dangerMutedBg12: 'rgba(239,68,68,0.12)',
  dangerBorder20: '1px solid rgba(239,68,68,0.20)',
  success: '#10B981',
  successMutedBg12: 'rgba(16,185,129,0.12)',
  successBorder25: '1px solid rgba(16,185,129,0.25)',
  successLight: '#34D399',
  dangerLight: '#F87171',
  warningAmber: '#CA8A04',
  warningOrange: '#F97316',
  codeSurface: '#0A0F1E',
  slateMuted: 'rgba(148,163,184,0.80)',
  strategicPurple: '#8B5CF6',
} as const;

/** Intake trace DAG node/edge colors (studio diagnostic graph). */
export const UI_INTAKE_TRACE_GRAPH = {
  edgeStroke: '#64748b',
  focusEdgeStroke: '#38bdf8',
  selectedEdgeStroke: '#34d399',
  focusedAlternateEdgeStroke: '#22d3ee',
  nodeByStatus: {
    required: { fill: '#7c4a03', stroke: '#f59e0b', text: '#fef3c7' },
    visible: { fill: '#0b3f5c', stroke: '#38bdf8', text: '#e0f2fe' },
    deferred: { fill: '#3b1f59', stroke: '#a78bfa', text: '#f3e8ff' },
    hidden: { fill: '#2f2f34', stroke: '#71717a', text: '#f4f4f5' },
    other: { fill: '#1f2937', stroke: '#94a3b8', text: '#e2e8f0' },
  },
} as const;
