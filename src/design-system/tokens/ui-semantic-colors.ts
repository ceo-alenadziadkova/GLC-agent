export const UI_SEMANTIC_COLORS = {
  danger: 'var(--score-1)',
  dangerFgStrong: 'var(--ui-danger-fg-strong)',
  dangerBgPale: 'var(--ui-danger-bg-pale)',
  dangerMutedBg: 'var(--ui-danger-muted-bg)',
  dangerMutedBg12: 'var(--ui-danger-muted-bg-12)',
  dangerBorder20: 'var(--ui-danger-border-20)',
  success: 'var(--glc-green)',
  successMutedBg12: 'var(--ui-success-muted-bg-12)',
  successBorder25: 'var(--ui-success-border-25)',
  successLight: 'var(--ui-success-light)',
  dangerLight: 'var(--ui-danger-light)',
  warningAmber: 'var(--ui-warning-amber)',
  warningOrange: 'var(--ui-warning-orange)',
  codeSurface: 'var(--ui-code-surface)',
  slateMuted: 'var(--ui-slate-muted)',
  strategicPurple: 'var(--ui-strategic-purple)',
} as const;

export const UI_INTAKE_TRACE_GRAPH = {
  edgeStroke: 'var(--ui-intake-edge-stroke)',
  focusEdgeStroke: 'var(--ui-intake-focus-edge-stroke)',
  selectedEdgeStroke: 'var(--ui-intake-selected-edge-stroke)',
  focusedAlternateEdgeStroke: 'var(--ui-intake-focused-alt-edge-stroke)',
  nodeByStatus: {
    required: {
      fill: 'var(--ui-intake-node-required-fill)',
      stroke: 'var(--ui-intake-node-required-stroke)',
      text: 'var(--ui-intake-node-required-text)',
    },
    visible: {
      fill: 'var(--ui-intake-node-visible-fill)',
      stroke: 'var(--ui-intake-node-visible-stroke)',
      text: 'var(--ui-intake-node-visible-text)',
    },
    deferred: {
      fill: 'var(--ui-intake-node-deferred-fill)',
      stroke: 'var(--ui-intake-node-deferred-stroke)',
      text: 'var(--ui-intake-node-deferred-text)',
    },
    hidden: {
      fill: 'var(--ui-intake-node-hidden-fill)',
      stroke: 'var(--ui-intake-node-hidden-stroke)',
      text: 'var(--ui-intake-node-hidden-text)',
    },
    other: {
      fill: 'var(--ui-intake-node-other-fill)',
      stroke: 'var(--ui-intake-node-other-stroke)',
      text: 'var(--ui-intake-node-other-text)',
    },
  },
} as const;
