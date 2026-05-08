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
  resilience: {
    /** Mirrors server stalled watchdog threshold (`SYSTEM_DEFAULTS.pipelineOrchestrator.stalledPhaseTimeoutMin`). */
    stalledPhaseWarningTimeoutMin: 15,
  },
  /**
   * Platform-admin only token-budget top-up suggestion.
   * Server policy (source of truth): `server/src/config/audit-token-budget-topup-policy.ts`.
   * Keep in sync; values mirrored here so the UI never blocks/permits a request the API would reject.
   */
  tokenBudgetTopup: {
    /** Show the admin banner when remaining budget falls to or below this percentage. */
    lowPct: 15,
    /** Quick-pick top-up amounts (matches server PRESETS). */
    presets: [50_000, 100_000, 200_000] as const,
    /** Smallest value accepted by the API. */
    minDelta: 1_000,
    /** Largest single grant accepted by the API. */
    maxDelta: 500_000,
    /** Max length of optional reason text. */
    reasonMaxLength: 500,
  },
  status: {
    nonStoppable: [
      PIPELINE_MONITOR_AUDIT_STATUS.completed,
      PIPELINE_MONITOR_AUDIT_STATUS.failed,
      PIPELINE_MONITOR_AUDIT_STATUS.cancelled,
    ] as const,
    completed: PIPELINE_MONITOR_AUDIT_STATUS.completed,
    created: PIPELINE_MONITOR_AUDIT_STATUS.created,
    /** Error / watchdog; same string as `PhaseView.status` when a phase card is failed. */
    failed: PIPELINE_MONITOR_AUDIT_STATUS.failed,
    review: PIPELINE_MONITOR_AUDIT_STATUS.review,
    cancelled: PIPELINE_MONITOR_AUDIT_STATUS.cancelled,
  },
  reviewModal: {
    contentMaxWidthDefault: 'max-w-[length:var(--pipeline-monitor-review-content-max-width)]',
    /** Wider when recon summary is shown (readable crawl table). */
    contentMaxWidthWithRecon: 'max-w-[length:var(--pipeline-monitor-review-with-recon-max-width)]',
    bodyMaxHeightDefault: 'max-h-[length:var(--pipeline-monitor-review-body-max-height)]',
    bodyMaxHeightWithRecon: 'max-h-[length:var(--pipeline-monitor-review-body-with-recon-max-height)]',
  },
  /** Header / sidebar emphasis for `/portal/pipeline` (token-backed classes in `src/styles/components/*.css`). */
  clientPortal: {
    headerProgressTrackClassName:
      'h-[length:var(--space-1)] min-w-[length:var(--pipeline-monitor-client-header-progress-min-width)] flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)] sm:w-40 sm:flex-none',
    headerProgressFillClassName: 'ds-pipeline-client-header-progress-fill',
    headerPercentClassName: 'text-xs font-mono font-medium tabular-nums text-[var(--text-secondary)]',
    phaseCardCurrentClassName: 'ds-pipeline-phase-card-current',
    /**
     * Narrow `/portal/pipeline`: detail panel is stacked above the steps column.
     * Caps steps height so the primary column keeps room in the fixed viewport shell.
     */
    mobileStackedStepsAsideClassName:
      'w-full max-h-[length:var(--pipeline-monitor-mobile-stacked-aside-max-height)] min-h-0 shrink-0 overflow-y-auto border-t-[length:var(--border-width-default)] border-t-[var(--border-subtle)]',
  },
} as const;
