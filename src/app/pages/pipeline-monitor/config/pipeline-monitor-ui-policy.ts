export const PIPELINE_MONITOR_UI_POLICY = {
  layout: {
    contentHeight: 'calc(100vh - var(--glc-mobile-nav-height))',
    sidebarWidthClassName: 'ds-pipeline-monitor-sidebar-w',
    loaderHeightClassName: 'h-64',
  },
  sizing: {
    progressBarHeight: 'var(--space-1)',
  },
  opacity: {
    disabledWing: 0.4,
    disabledWingGrid: 0.35,
  },
  animation: {
    progressDurationSec: 1,
    panelTransitionDurationSec: 0.25,
    runningBarDurationSec: 4,
    logEntryDelayStepSec: 0.07,
    logEntryDurationSec: 0.24,
    cursorBlinkDurationSec: 0.65,
  },
  status: {
    nonStoppable: ['completed', 'failed', 'cancelled'] as const,
    created: 'created',
  },
} as const;
