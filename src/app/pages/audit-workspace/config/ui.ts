export const AUDIT_WORKSPACE_UI = {
  layout: {
    viewportOffset: 'calc(100vh - var(--glc-mobile-nav-height))',
    sidebarWidthClass: 'ds-audit-workspace-sidebar-w',
    /** Horizontal panel group (desktop): left sidebar as % of row width */
    sidebarPanelDefaultSizePct: 22,
    sidebarPanelMinSizePct: 14,
    sidebarPanelMaxSizePct: 48,
    sidebarPanelCollapsedSizePct: 0,
    /** Minimum % for main content column so report body stays usable */
    sidebarPanelRightMinSizePct: 45,
    sidebarLayoutAutoSaveId: 'glc-audit-workspace-sidebar-layout-v1',
    briefPanelMaxHeightClass: 'max-h-[42vh]',
    contentMaxWidthClass: 'max-w-2xl',
  },
  scoreRingSize: 48,
  issueSeverityMinWidth: 48,
  transitions: {
    hoverSlideDuration: 0.14,
    contentFadeDuration: 0.25,
    staggerDelayStep: 0.06,
    rowFadeDuration: 0.22,
    expandDuration: 0.25,
    chevronRotateDuration: 0.2,
    panelEase: [0.16, 1, 0.3, 1] as const,
  },
} as const;
