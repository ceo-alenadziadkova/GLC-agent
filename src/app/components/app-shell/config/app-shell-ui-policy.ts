import { BREAKPOINT_TOKENS } from '../../../../design-system/tokens/breakpoints';

export const APP_SHELL_UI_POLICY = {
  media: {
    smMinWidth: `(min-width: ${BREAKPOINT_TOKENS.sm})`,
  },
  colors: {
    white08: 'var(--sidebar-border)',
    white06: 'var(--sidebar-border)',
    white05: 'var(--overlay-shadow-soft)',
    white046: 'var(--overlay-white-46)',
    white038: 'var(--overlay-white-38)',
    white02: 'var(--overlay-white-20)',
    white015: 'var(--overlay-white-15)',
    white045: 'var(--overlay-white-45)',
    white035: 'var(--overlay-white-35)',
    white03: 'var(--overlay-white-30)',
  },
  brand: {
    activeNavBackground: 'linear-gradient(90deg, var(--glc-blue-muted-strong) 0%, var(--glc-blue-muted-soft) 100%)',
    activeNavBorder: 'var(--border-width-default) solid var(--callout-info-border)',
    activeNavGlow: 'var(--glow-blue-sm)',
    activeBadgeBackground: 'var(--callout-info-border)',
    activeBadgeBorder: 'var(--border-width-default) solid var(--callout-info-border)',
  },
  overlay: {
    mobileBackdrop: 'var(--overlay-backdrop)',
  },
  mobile: {
    drawerWidth: 'var(--app-shell-drawer-width)',
    unreadBadgeCap: 99,
    bottomNavShadow: 'var(--shadow-mobile-bottom-nav)',
  },
  nav: {
    skeletonCount: 5,
  },
} as const;
