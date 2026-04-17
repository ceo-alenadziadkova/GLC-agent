export const HOME_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]';

export const HOME_DISPLAY_H2 =
  'font-display text-3xl font-semibold tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]';

export const HOME_DEFAULT_H2 = 'font-display text-2xl font-bold tracking-tight sm:text-3xl';

export const HOME_SURFACE_CARD_STYLE = {
  borderRadius: 'var(--radius-xl)',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-surface)',
  boxShadow: 'none',
} as const;

export const HOME_CHIP_STYLE = {
  borderColor: 'var(--border-subtle)',
  backgroundColor: 'color-mix(in oklab, var(--bg-surface) 88%, transparent)',
  color: 'var(--text-secondary)',
} as const;
