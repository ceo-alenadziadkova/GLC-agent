export const SPACING_TOKENS = {
  0.5: 'var(--space-0-5)',
  1: 'var(--space-1)',
  1.4: 'var(--space-1-4)',
  1.5: 'var(--space-1-5)',
  2: 'var(--space-2)',
  2.5: 'var(--space-2-5)',
  3: 'var(--space-3)',
  3.5: 'var(--space-3-5)',
  4: 'var(--space-4)',
  4.5: 'var(--space-4-5)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  7: 'var(--space-7)',
  8: 'var(--space-8)',
  10: 'var(--space-10)',
  12: 'var(--space-12)',
  16: 'var(--space-16)',
} as const;

export type SpacingScale = keyof typeof SPACING_TOKENS;
