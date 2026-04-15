import type { CSSProperties } from 'react';

/**
 * Inline styles for outcome triad cards on Focus / Context / Strategy marketing pages.
 * Parent band uses `bg-muted`; cards lift slightly on `surface` for separation.
 */
export const PACKAGE_MARKETING_OUTCOME_CARD = {
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-surface)',
} as const satisfies CSSProperties;
