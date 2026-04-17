export const SHADOW_TOKENS = {
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
  card: 'var(--shadow-card)',
  glass: 'var(--glass-shadow)',
  focus: 'var(--shadow-blue)',
  glowBlue: 'var(--glow-blue)',
  glowOrange: 'var(--glow-orange)',
  glowGreen: 'var(--glow-green)',
} as const;

export type ShadowTokens = typeof SHADOW_TOKENS;
