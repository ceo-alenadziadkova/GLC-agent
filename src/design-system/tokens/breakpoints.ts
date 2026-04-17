/**
 * Canonical design-system breakpoint tokens.
 * Values intentionally reference CSS custom properties from tokens.css.
 */
export const BREAKPOINT_TOKENS = {
  sm: 'var(--breakpoint-sm)',
  lg: 'var(--breakpoint-lg)',
  xl: 'var(--breakpoint-xl)',
} as const;

export type BreakpointTokens = typeof BREAKPOINT_TOKENS;
