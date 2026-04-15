/**
 * Named surface presets for marketing visual roles (CSS variables only — no raw hex).
 * Use with `style={...}` or merge into layout components.
 */
export const MARKETING_SURFACE_COMPARISON_SHELL = {
  borderRadius: 'var(--radius-2xl)',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'unset',
} as const;

export const MARKETING_SURFACE_MUTED_BAND = {
  borderRadius: 'var(--radius-2xl)',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-muted)',
} as const;

export const MARKETING_SURFACE_INSET_SECTION = {
  borderRadius: 'var(--radius-2xl)',
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-inset)',
} as const;

/** Min heights (rem) for home “What we do” feature panels — varied rhythm. */
export const MARKETING_HOME_FEATURE_PANEL_MIN_HEIGHT_REM = [12.5, 14, 11.5, 13] as const;

/** Accent treatment for package hero badges (Focus / Context / Strategy). */
export const MARKETING_PACKAGE_BADGE_VARIANTS = {
  focus: {
    backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 66%, var(--bg-surface))',
    borderColor: 'color-mix(in oklab, var(--glc-blue) 36%, var(--border-subtle))',
    color: 'var(--glc-blue-light)',
  },
  context: {
    backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 84%, var(--bg-surface))',
    borderColor: 'color-mix(in oklab, var(--glc-blue) 38%, var(--border-subtle))',
    color: 'var(--glc-blue-light)',
  },
  strategy: {
    backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 72%, var(--bg-surface))',
    borderColor: 'color-mix(in oklab, var(--glc-blue) 34%, var(--border-subtle))',
    color: 'var(--glc-blue-light)',
  },
} as const;

/** Coverage cell states used in package hero coverage grids. */
export const MARKETING_COVERAGE_GRID_CELL = {
  base: {
    borderColor: 'color-mix(in oklab, rgba(255,255,255,0.2) 56%, var(--border-subtle))',
    backgroundColor: 'color-mix(in oklab, var(--bg-muted) 75%, var(--bg-surface))',
  },
  active: {
    borderColor: 'color-mix(in oklab, var(--glc-blue) 48%, var(--border-default))',
    backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 92%, var(--bg-surface))',
  },
} as const;

export const MARKETING_COVERAGE_GRID_LABEL = {
  active: {
    color: 'var(--glc-blue-light)',
  },
  inactive: {
    color: 'var(--text-tertiary)',
  },
} as const;

export const MARKETING_HERO_CHIP = {
  backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 76%, transparent)',
  borderColor: 'color-mix(in oklab, var(--glc-blue) 24%, var(--border-subtle))',
  color: 'var(--glc-blue-deeper)',
} as const;

/** Premium focus ring for form controls on public pages. */
export const MARKETING_FORM_FIELD_FOCUS = {
  borderColor: 'var(--glc-blue)',
  boxShadow: 'var(--shadow-blue)',
} as const;

/** Default field border for dark-aware public forms. */
export const MARKETING_FORM_FIELD_BORDER = {
  borderColor: 'color-mix(in oklab, rgba(255,255,255,0.15) 96%, var(--border-default))',
} as const;

/** Accent CTA that stays vivid even in disabled state. */
export const MARKETING_PRIMARY_CTA = {
  background: 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-deeper) 100%)',
  color: 'var(--primary-foreground)',
  disabledBackground: 'linear-gradient(135deg, color-mix(in oklab, var(--glc-blue) 75%, var(--bg-muted)) 0%, color-mix(in oklab, var(--glc-blue-deeper) 70%, var(--bg-muted)) 100%)',
  disabledColor: 'color-mix(in oklab, var(--primary-foreground) 78%, transparent)',
} as const;
