import { ORCHESTRATION_IA_COPY } from './orchestration-roadmap-ui-copy.en';

/** Shared typographic placeholder for empty table/export fields (copy layer). */
const STRATEGY_LAB_EMPTY_FIELD = '—' as const;

/** Single title for the roadmap / pack summary column (drawer + sidebar). */
export const STRATEGY_LAB_PLAN_SUMMARY_TITLE = 'Plan summary' as const;

export const STRATEGY_LAB_COPY = {
  depthFilter: {
    all: 'All depths',
    baseline: 'Baseline only',
    deep: 'Deep only',
    hint: 'Filter nodes by director analysis depth. Timeline remains the primary sequencing surface.',
  },
  /** Consultant switch between orchestration tooling and plan execution surfaces (`/strategy` vs `/roadmap`). */
  workbenchSegment: {
    ariaLabel: 'Strategy Lab workspace mode',
    description:
      'Orchestration builds the manifest and pack in Strategy Lab. Plan opens the Roadmap schedule first; on that page, switch between Roadmap and Timeline to move from lane-based schedule to the seasonal execution timeline.',
    orchestrationLabel: 'Orchestration',
    /** Entry to plan execution (`/roadmap`) — pair with Timeline under Plan tabs. */
    planLabel: 'Plan',
    /** Visible under the control: disambiguates Plan vs in-page Roadmap/Timeline (no second progress UI). */
    surfaceHint:
      'Plan opens Roadmap (schedule, dependencies, baseline). On that page, pick Timeline for the seasonal lanes view.',
  },
  /** Cross-surface journey: Strategy Lab preparation then Plan execution (consultant-facing header). */
  journeyStrip: {
    ariaLabel: 'Planning journey',
    description:
      'Four checkpoints from audit context to manifest, built pack, and plan execution on Roadmap and Timeline. Links jump to Strategy Lab anchors or open the Plan surface.',
    step1Title: 'Context',
    step1Hint: 'Audit scope, constraints and benchmarks pinned.',
    step2Title: 'Manifest',
    step2Hint: 'Scenario, horizon and snapshots aligned before pack build.',
    step3Title: 'Pack',
    step3Hint: 'Built orchestration pack — inspect dependency map below.',
    step4Title: 'Plan',
    step4Hint: 'Roadmap schedule and seasonal Timeline — switch tabs on the Plan surface.',
    statusDone: 'Done',
    statusCurrent: 'Now',
    statusPending: 'Next',
  },
  /** Helper text under breadcrumb when Plan tabs are omitted (manifest wizard surface). */
  manifestWizardChrome: {
    contextHint:
      'Set scenario and horizon here, save a manifest snapshot, then build your pack. Open Roadmap or Timeline from Strategy Lab once the pack is ready.',
  },
  /** Nested Plan view tabs (schedule lanes vs timeline). */
  planViewSegment: {
    ariaLabel: 'Plan presentation',
    description: 'Switch between the multi-lane schedule and the seasonal execution timeline.',
    roadmapTabLabel: 'Roadmap',
    timelineTabLabel: 'Timeline',
    /** Visible under the segment control: how the two surfaces differ. */
    differentiationIntro:
      'Roadmap is the lane-based Gantt schedule with dependencies, search, and baseline comparison. Timeline is the seasonal execution view with pack narrative and read-focused lane stories.',
    /** Shown when Roadmap is active. */
    roadmapContextHint:
      'You are on the schedule: navigate tasks and lanes, inspect dependency paths, and compare to a saved baseline. Use keyboard shortcuts for the grid; lane changes are available from the task menu when applicable.',
    /** Shown when Timeline is active. */
    timelineContextHint:
      'You are on the execution timeline: seasonal buckets, lane stories and read-focused navigation — not the interactive Gantt.',
  },
  /** Breadcrumb above Plan chrome (Roadmap / Timeline pages). */
  planSurfaceBreadcrumb: {
    navAriaLabel: 'Plan location',
    strategyLabCrumb: 'Strategy Lab',
    planCrumb: 'Plan',
    /** Current page in client manifest-first wizard (`/portal/audit/:id/roadmap-manifest`). */
    manifestWizardCrumb: 'Manifest setup',
  },
  referenceDisclosure: {
    summary: 'Reference: peer benchmarks and constraint overrides',
    hint: 'Optional tuning for initiative rules — expand when you need industry context or to override intake assumptions.',
    /** Always-visible preview line shown in the accordion trigger (uses {available}/{total} placeholders). */
    previewBenchmarks: 'Benchmarks: {available}/{total} available',
    /** Shown when at least one constraint axis is set as a Strategy Lab override (uses {summary} placeholder). */
    previewConstraintsOverridden: 'Constraints overridden: {summary}',
    /** Shown when no constraint axis is overridden — Strategy Lab uses the intake brief defaults (uses {summary} placeholder). */
    previewConstraintsFromBrief: 'Constraints from brief: {summary}',
    /** Shown until effective constraints arrive (e.g. older audits without strategy block). */
    previewConstraintsUnknown: 'Constraints not set yet',
  },
  /** `<summary>` labels for collapsible blocks in StrategyLabOrchestrationPanel */
  orchestrationDisclosure: {
    /** Single Advanced settings disclosure that groups Stage-2 intent, snapshot history and commercial offers. */
    advancedSummary: 'Advanced settings: deep intent, snapshot history, coverage offers',
    advancedHint:
      'Optional controls. Most plans build cleanly without these. Open this group only when you need to tune deep follow-up, browse prior manifests, or weigh coverage expansions.',
    /** Always-visible preview line for the Advanced accordion trigger. Tokens are joined with ` · `. */
    advancedPreviewStage2None: 'Stage-2 intent: not set',
    advancedPreviewStage2Count: 'Stage-2 intent: {count} domain(s)',
    advancedPreviewSnapshotsCount: 'Snapshots: {count}',
    advancedPreviewSnapshotsEmpty: 'Snapshots: none yet',
    advancedPreviewOffersReady: 'Coverage offers: ready',
    advancedPreviewOffersIdle: 'Coverage offers: not requested',
    directorStage2Summary: 'Stage-2 deep director intent',
    snapshotHistorySummary: 'Manifest snapshot history',
    commercialSummary: 'Optional coverage expansion offers',
    /** Group heading for plan diagnostics (governance + version history + pack inspection) — flat, not collapsed. */
    diagnosticsGroupTitle: 'Plan quality and history',
    diagnosticsGroupHint:
      'Diagnostics for the latest pack: planner governance, revision deltas and node-level inspection.',
    diagnosticsSummary: 'Plan quality diagnostics',
    versionHistorySummary: 'Version history and change details',
    packInspectionSummary: 'Inspect pack nodes by analysis depth',
  },
  orchestratorTabs: {
    tablistAriaLabel: 'Orchestrator: critical path, dependencies, and risks',
    /** Composed into a polite aria-live region when the orchestrator tab changes (single shared tabpanel). */
    tabPanelStatusTemplate: '{title}. {desc}',
    tablistAriaDescription:
      'One panel below switches content by tab; your screen reader announces the active view when it changes.',
    now: 'Now',
    next: 'Next',
    dependencies: 'Dependencies',
    risks: 'Risks',
    nowDesc: 'Head of the critical path',
    nextDesc: 'Mid and later milestones',
    dependenciesDesc: 'Ordering links',
    dependenciesListTitle: 'Dependency rows',
    risksDesc: 'Resolved planner trade-offs',
    emptyNow: 'No items in this bucket.',
    emptyNext: 'No further milestones on the critical path.',
    emptyDependencies: 'No dependency edges in this pack.',
    emptyRisks: 'No planner conflict notes on this pack.',
    risksShownOfTotal: 'Showing {shown} of {total} resolved conflicts',
    risksShowAll: 'Show all',
    risksShowFewer: 'Show fewer',
    pickNode: 'Select a node from the list to inspect details.',
    analysisDepth: 'Analysis depth',
    laneLabel: 'Lane',
    domainLabel: 'Domain',
    unknownNode: 'This node is not in the current pack.',
    clearSelection: 'Clear',
  },
  /** Consultant copy for embedded pack graph (same component as portal timeline). */
  packDependencyMap: {
    sectionTitle: 'Plan dependency map',
    sectionHint:
      'Interactive view of the saved orchestration pack — same topology the client sees on the timeline. Use it while validating manifest scope and rebuilds.',
    graphCanvasFallbackNote:
      'The advanced graph canvas is turned off — showing the timeline-style dependency map instead.',
    graphCanvasFallbackAriaDetail:
      'Uses the same pack as the timeline: rows and simplified map remain available while the spatial graph view stays off.',
  },
  appShell: {
    title: 'Strategy Lab',
    subtitle: ORCHESTRATION_IA_COPY.strategyLabAppShellSubtitle,
    loadingSubtitle: 'Loading...',
    errorSubtitle: 'Error',
    unavailableSubtitle: 'Not available yet',
  },
  panel: {
    /** Inline confirm pattern for commercial accept (replaces overlay AlertDialog). */
    commercialAcceptInlineHint: 'Confirm to accept this offer and rebuild the pack with extra coverage.',
    commercialAcceptInlineConfirmLabel: 'Confirm accept',
    commercialAcceptInlineCancelLabel: 'Cancel',
    /** Surfaced beside the disabled Build pack button when the manifest signature has unsaved drift. */
    buildPackBlockedAriaHint: 'Save the current manifest snapshot before building the pack.',
    /** Tooltip-like label clarifying primary CTA intent. */
    buildPackPrimaryAria: 'Build orchestration pack from the saved manifest snapshot',
    saveSnapshotSecondaryAria: 'Save the current manifest as a new snapshot',
    domainBenchmarksTitle: 'Domain benchmarks',
    domainBenchmarksHint:
      'Median confidence (p50) vs peer runs in the last 90 days. Uses your audit industry when set, otherwise the cross-industry pool.',
    emptyBenchmarksValue: STRATEGY_LAB_EMPTY_FIELD,
    yourRoadmap: STRATEGY_LAB_PLAN_SUMMARY_TITLE,
    summaryHint:
      'Pick a node in the orchestrator tabs to inspect lane, domain and analysis depth here.',
    viewReport: 'View Report',
    resizeHandle: 'Resize roadmap summary panel',
    resizeHint: 'Drag to resize. Double-click to collapse or expand.',
    /**
     * Mobile-only Plan summary drawer (Sheet). On narrow viewports the side summary
     * panel is replaced with a Sheet to keep the main column readable; the trigger
     * lives at the bottom of the main column and auto-opens once a node is picked.
     */
    summaryDrawerTriggerLabel: 'Open plan summary',
    summaryDrawerTitle: STRATEGY_LAB_PLAN_SUMMARY_TITLE,
    summaryDrawerNodeSelectedHint: 'Node selected — open to inspect detail',
    summaryDrawerNoSelectionHint: 'Open after picking a node from the orchestrator tabs',
  },
  messages: {
    auditNotFound: 'Audit not found',
    notGenerated: 'Strategy data not yet generated',
    completePipeline: 'Complete the pipeline to generate strategy',
    retryLoad: 'Retry',
    offlineHint: 'You appear to be offline. Reconnect, then try again.',
  },
  constraints: {
    sectionTitle: 'Constraint assumptions',
    sectionHint:
      'These values drive initiative constraint rules (for example scalable paths vs budget). Saved values override the intake brief until you clear them.',
    companyStage: 'Company stage',
    budgetBand: 'Budget band',
    teamScale: 'Team size',
    save: 'Save overrides',
    useBrief: 'Clear overrides (use intake brief)',
    saveOk: 'Constraint overrides saved.',
    clearOk: 'Overrides cleared. Intake brief values apply again.',
    saveFailed: 'Could not save constraint overrides.',
    /** Closes inline save error (`role="status"` + aria-live); success clears automatically. */
    dismissSaveError: 'Dismiss',
    optionLabels: {
      stage: {
        idea: 'Idea',
        mvp: 'MVP',
        growth: 'Growth',
        scale: 'Scale',
        stabilization: 'Stabilisation',
      },
      budget: {
        unknown: 'Unknown / not shared',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      },
      team: {
        solo: 'Solo',
        small: '2–10 people',
        medium: '11–50',
        large: '51–200',
        enterprise: '200+',
        unknown: 'Unknown / not shared',
      },
    },
  },
  directorStage2Intent: {
    title: 'Stage-2 deep intent',
    body:
      'Select domains for a deliberate deep director follow-up. Re-run those domain phases in the pipeline, then save a manifest snapshot and regenerate the pack. This records intent only; it does not start runs automatically.',
    domainsLabel: 'Domains in scope',
    save: 'Save intent',
    saving: 'Saving…',
    saved: 'Deep intent saved',
    clear: 'Clear saved intent',
    clearSaved: 'Intent cleared',
    saveFailed: 'Could not save intent',
    selectedSummary: 'Marked for deep follow-up',
  },
} as const;

/**
 * Logical groupings over {@link STRATEGY_LAB_COPY} (references only — no duplicated strings).
 * Use for tooling, docs navigation, or future role-scoped loaders without breaking existing imports.
 */
export const STRATEGY_LAB_COPY_CONTEXT = {
  consultantWorkbench: STRATEGY_LAB_COPY.workbenchSegment,
  journey: STRATEGY_LAB_COPY.journeyStrip,
  planSurfaces: {
    segmentedNav: STRATEGY_LAB_COPY.planViewSegment,
    breadcrumb: STRATEGY_LAB_COPY.planSurfaceBreadcrumb,
    manifestWizardChrome: STRATEGY_LAB_COPY.manifestWizardChrome,
  },
  orchestrationLab: STRATEGY_LAB_COPY.orchestrationDisclosure,
  orchestrator: STRATEGY_LAB_COPY.orchestratorTabs,
  planSummary: STRATEGY_LAB_COPY.panel,
  benchmarksAndReference: STRATEGY_LAB_COPY.referenceDisclosure,
  constraints: STRATEGY_LAB_COPY.constraints,
  packDependencyMap: STRATEGY_LAB_COPY.packDependencyMap,
  depthFilter: STRATEGY_LAB_COPY.depthFilter,
  directorStage2: STRATEGY_LAB_COPY.directorStage2Intent,
  errorsLoading: STRATEGY_LAB_COPY.messages,
  appChrome: STRATEGY_LAB_COPY.appShell,
} as const;
