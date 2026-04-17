export const COLOR_TOKENS = {
  cssVars: {
    bg: {
      canvas: 'var(--bg-canvas)',
      surface: 'var(--bg-surface)',
      elevated: 'var(--bg-elevated)',
    },
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      tertiary: 'var(--text-tertiary)',
      quaternary: 'var(--text-quaternary)',
    },
    border: {
      subtle: 'var(--border-subtle)',
      default: 'var(--border-default)',
      strong: 'var(--border-strong)',
    },
    overlay: {
      backdrop: 'var(--overlay-backdrop)',
      backdropStrong: 'var(--overlay-backdrop-strong)',
      shadowSoft: 'var(--overlay-shadow-soft)',
      white46: 'var(--overlay-white-46)',
      white45: 'var(--overlay-white-45)',
      white38: 'var(--overlay-white-38)',
      white35: 'var(--overlay-white-35)',
      white30: 'var(--overlay-white-30)',
      white20: 'var(--overlay-white-20)',
      white15: 'var(--overlay-white-15)',
    },
    brand: {
      blue: 'var(--glc-blue)',
      orange: 'var(--glc-orange)',
      green: 'var(--glc-green)',
    },
    /** Use on fills using `var(--gradient-accent)` (see tokens.css). */
    onWarmGradientFg: 'var(--on-warm-gradient-fg)',
    score: {
      critical: 'var(--score-1)',
      needsWork: 'var(--score-2)',
      moderate: 'var(--score-3)',
      good: 'var(--score-4)',
      excellent: 'var(--score-5)',
    },
  },
  semantic: {
    status: {
      critical: 'var(--score-1)',
      needsWork: 'var(--score-2)',
      moderate: 'var(--score-3)',
      good: 'var(--score-4)',
      excellent: 'var(--score-5)',
    },
    callout: {
      infoBg: 'var(--callout-info-bg)',
      infoBorder: 'var(--callout-info-border)',
      warningBg: 'var(--callout-warning-bg)',
      warningBorder: 'var(--callout-warning-border)',
      dangerBg: 'var(--callout-error-bg)',
      dangerBorder: 'var(--callout-error-border)',
    },
    /** Mirrors former `UI_SEMANTIC_COLORS` — values only as `var(--*)` (SSOT: tokens.css). */
    uiSemantic: {
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
    },
    /** Intake trace graph (React Flow) — former `UI_INTAKE_TRACE_GRAPH`. */
    intakeTraceGraph: {
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
    },
  },
} as const;

export type ColorTokens = typeof COLOR_TOKENS;
