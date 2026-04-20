/** Persisted `audits.status` strings used by Pipeline Monitor (must match API contract). */
const PIPELINE_MONITOR_AUDIT_STATUS = {
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  created: 'created',
  review: 'review',
} as const;

export const PIPELINE_MONITOR_UI_POLICY = {
  layout: {
    /** Main column height below mobile nav (see `.ds-audit-workspace-main-h`). */
    contentClassName: 'ds-audit-workspace-main-h',
    sidebarWidthClassName: 'ds-pipeline-monitor-sidebar-w',
    sidebarLayoutAutoSaveId: 'pipeline-monitor:sidebar-layout',
    sidebarPanelDefaultSizePct: 28,
    sidebarPanelMinSizePct: 19,
    sidebarPanelMaxSizePct: 42,
    detailPanelMinSizePct: 45,
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
    nonStoppable: [
      PIPELINE_MONITOR_AUDIT_STATUS.completed,
      PIPELINE_MONITOR_AUDIT_STATUS.failed,
      PIPELINE_MONITOR_AUDIT_STATUS.cancelled,
    ] as const,
    created: PIPELINE_MONITOR_AUDIT_STATUS.created,
    /** Error / watchdog; same string as `PhaseView.status` when a phase card is failed. */
    failed: PIPELINE_MONITOR_AUDIT_STATUS.failed,
    review: PIPELINE_MONITOR_AUDIT_STATUS.review,
    cancelled: PIPELINE_MONITOR_AUDIT_STATUS.cancelled,
  },
  reviewModal: {
    contentMaxWidthDefault: 'max-w-[560px]',
    /** Wider when recon summary is shown (readable crawl table). */
    contentMaxWidthWithRecon: 'max-w-[min(96vw,40rem)]',
    bodyMaxHeightDefault: 'max-h-[440px]',
    bodyMaxHeightWithRecon: 'max-h-[min(72vh,36rem)]',
  },
  /** Header / sidebar emphasis for `/portal/pipeline` (token-backed classes in `components.css`). */
  clientPortal: {
    headerProgressTrackClassName: 'h-[var(--space-1)] min-w-[7rem] flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)] sm:w-40 sm:flex-none',
    headerProgressFillClassName: 'ds-pipeline-client-header-progress-fill',
    headerPercentClassName: 'text-xs font-mono font-medium tabular-nums text-[var(--text-secondary)]',
    phaseCardCurrentClassName: 'ds-pipeline-phase-card-current',
    /**
     * Narrow `/portal/pipeline`: detail panel is stacked above the steps column.
     * Caps steps height so the primary column keeps room in the fixed viewport shell.
     */
    mobileStackedStepsAsideClassName:
      'w-full max-h-[min(45vh,24rem)] min-h-0 shrink-0 overflow-y-auto border-t-[length:var(--border-width-default)] border-t-[var(--border-subtle)]',
  },
} as const;
