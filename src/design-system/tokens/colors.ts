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
  },
} as const;

export type ColorTokens = typeof COLOR_TOKENS;
