export const TYPOGRAPHY_TOKENS = {
  fontFamily: {
    sans: 'var(--font-sans)',
    display: 'var(--font-display)',
    mono: 'var(--font-mono)',
    logo: 'var(--font-logo)',
  },
  fontSize: {
    '2xs': 'var(--text-2xs)',
    xs: 'var(--text-xs)',
    sm: 'var(--text-sm)',
    base: 'var(--text-base)',
    lg: 'var(--text-lg)',
    xl: 'var(--text-xl)',
    '2xl': 'var(--text-2xl)',
    '3xl': 'var(--text-3xl)',
    '4xl': 'var(--text-4xl)',
  },
  lineHeight: {
    none: 'var(--leading-none)',
    tight: 'var(--leading-tight)',
    snug: 'var(--leading-snug)',
    normal: 'var(--leading-normal)',
    relaxed: 'var(--leading-relaxed)',
  },
  letterSpacing: {
    tighter: 'var(--tracking-tighter)',
    tight: 'var(--tracking-tight)',
    normal: 'var(--tracking-normal)',
    wide: 'var(--tracking-wide)',
    wider: 'var(--tracking-wider)',
    widest: 'var(--tracking-widest)',
    subtitle: 'var(--tracking-subtitle)',
    drawerCaps: 'var(--tracking-drawer-caps)',
    roleMeta: 'var(--tracking-role-meta)',
  },
  fontWeight: {
    regular: 'var(--font-weight-normal)',
    medium: 'var(--font-weight-medium)',
    semibold: 'var(--font-weight-semibold)',
    bold: 'var(--font-weight-bold)',
  },
} as const;

export type TypographyTokens = typeof TYPOGRAPHY_TOKENS;
