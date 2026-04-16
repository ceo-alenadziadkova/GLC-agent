export const APP_SHELL_UI_POLICY = {
  media: {
    smMinWidth: '(min-width: 640px)',
  },
  colors: {
    white08: 'rgba(255,255,255,0.08)',
    white06: 'rgba(255,255,255,0.06)',
    white05: 'rgba(255,255,255,0.05)',
    white046: 'rgba(255,255,255,0.46)',
    white038: 'rgba(255,255,255,0.38)',
    white02: 'rgba(255,255,255,0.20)',
    white015: 'rgba(255,255,255,0.15)',
    white045: 'rgba(255,255,255,0.45)',
    white035: 'rgba(255,255,255,0.35)',
    white03: 'rgba(255,255,255,0.30)',
  },
  brand: {
    activeNavBackground: 'linear-gradient(90deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
    activeNavBorder: '1px solid rgba(28,189,255,0.18)',
    activeNavGlow: '0 0 8px rgba(28,189,255,0.7)',
    activeBadgeBackground: 'rgba(28,189,255,0.22)',
    activeBadgeBorder: '1px solid rgba(28,189,255,0.25)',
  },
  overlay: {
    mobileBackdrop: 'rgba(8,15,30,0.45)',
  },
  mobile: {
    drawerWidth: 'min(20rem,88vw)',
    unreadBadgeCap: 99,
    bottomNavShadow: '0 -4px 12px rgba(11,17,32,0.06)',
  },
  nav: {
    skeletonCount: 5,
    sectionCaptionSizePx: '9px',
    itemLabelSizePx: '10px',
  },
} as const;

