export const PIPELINE_MONITOR_UI_POLICY = {
  layout: {
    /** Main column height below mobile nav (see `.ds-audit-workspace-main-h`). */
    contentClassName: 'ds-audit-workspace-main-h',
    sidebarWidthClassName: 'ds-pipeline-monitor-sidebar-w',
    loaderHeightClassName: 'h-64',
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
