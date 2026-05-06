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
  /** Consultant switch between orchestration tooling and plan execution surfaces (`/strategy` vs `/plan`). */
  workbenchSegment: {
    ariaLabel: 'Strategy Lab workspace mode',
    description:
      'Strategy Lab defines the roadmap contract (context, manifest, pack). Plan is where delivery work runs — Board, Roadmap, or legacy Timeline tabs.',
    orchestrationLabel: 'Orchestration',
    /** Entry to plan execution (`/plan`) — pair with segmented Plan tabs. */
    planLabel: 'Plan',
    /** Visible under the control: disambiguates Plan vs in-page Roadmap/Timeline (no second progress UI). */
    surfaceHint:
      'Strategy Lab = definition and rebuilds. Plan = Board (when rolled out), Gantt Roadmap, or legacy Timeline.',
  },
  /** In-page IA: three phases on `/strategy/:id` (consultant). */
  iaPhasesNav: {
    ariaLabel: 'Strategy Lab phases on this page',
    intro:
      'Work in three phases on this screen: define context, shape the saved pack, then publish and operate (manifest → build → Plan).',
    defineLinkLabel: 'Define context',
    shapeLinkLabel: 'Shape pack',
    publishLinkLabel: 'Publish & operate',
  },
  /** Cross-surface journey: Strategy Lab preparation then Plan execution (consultant-facing header). */
  journeyStrip: {
    ariaLabel: 'Planning journey',
    /** Plan `/plan`: four-step strip starts collapsed behind a control (less chrome above Roadmap/Board). */
    planSurfaceJourneyCollapseShow: 'Show planning journey',
    planSurfaceJourneyCollapseHide: 'Hide planning journey',
    description:
      'Four checkpoints — context and references, manifest contract, execution pack inspection, then the Plan surface for delivery. In-page links use the Define / Shape / Publish sections on Strategy Lab.',
    step1Title: 'Context',
    step1Hint: 'Tune benchmarks and constraint assumptions (Define section).',
    step2Title: 'Manifest',
    step2Hint: 'Scenario, horizon, snapshot — Publish & operate block below.',
    step3Title: 'Pack',
    step3Hint: 'Critical path lists + initiatives — Shape pack section.',
    step4Title: 'Plan',
    step4Hint: 'Open Plan for Board, Roadmap, or legacy Timeline — execution and ordering.',
    statusDone: 'Done',
    statusCurrent: 'Now',
    statusPending: 'Next',
  },
  /** Helper text under breadcrumb when Plan tabs are omitted (manifest wizard surface). */
  manifestWizardChrome: {
    contextHint:
      'Set scenario and horizon here, save a manifest snapshot, then build your pack. Open Plan (delivery board or roadmap when enabled, or legacy Timeline) from Strategy Lab once the pack is ready.',
  },
  /** Nested Plan view tabs (schedule lanes vs timeline). */
  planViewSegment: {
    ariaLabel: 'Plan presentation',
    description: 'Switch between delivery execution, schedule, and seasonal narrative projections.',
    boardTabLabel: 'Board',
    roadmapTabLabel: 'Roadmap',
    timelineTabLabel: 'Timeline',
    /** Collapsible “learn more” control (reduces noise next to tabs). */
    learnMoreTrigger: 'How these views differ',
    learnMoreHide: 'Hide explanation',
    /** Visible under the segment control: how surfaces differ (expanded on demand). */
    differentiationIntro:
      'Board: operational columns for delivery state (DnD and manual backlog). Roadmap: time-based schedule with filters and dependencies. Timeline: legacy seasonal narrative projection.',
    /** Shown when Roadmap is active — one short line under tabs. */
    roadmapContextHint: 'Schedule view: inspect timing, filters, dependencies, baseline. Drag-and-drop workflow lives on Board.',
    /** Shown when Board is active. */
    boardContextHint: 'Execution board: move cards across columns and add backlog work. Timeline bars follow the packed schedule.',
    /** Shown when Timeline is active. */
    timelineContextHint: 'Legacy seasonal lanes (read-focused). Prefer Roadmap or Board for structured delivery.',
    /** Compact Plan toolbar: opens menu with Board vs Roadmap vs Timeline guidance. */
    toolbarViewsHelpAriaLabel: 'Help: how Board, Roadmap, and Timeline differ',
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
  /** Progress checklist at top of StrategyLabOrchestrationPanel */
  orchestrationWorkflowStatus: {
    title: 'Where you are',
    manifestDirty: 'Manifest has unsaved changes — save a snapshot before Build.',
    manifestSynced: 'Manifest matches the saved snapshot baseline.',
    packPresent: 'Execution pack saved (version {version}).',
    packMissing: 'No execution pack saved yet — save a manifest snapshot, then Build pack.',
    boardHintsQueued: 'Delivery Board hints are queued — save a manifest snapshot to sign them into the contract.',
  },
  /** `<summary>` labels for collapsible blocks in StrategyLabOrchestrationPanel */
  orchestrationDisclosure: {
    /** Single Advanced disclosure: diagnostics, Stage-2, snapshots, commercial, board identity. */
    advancedSummary: 'Advanced: plan diagnostics, deep intent, snapshots, coverage offers, board identity',
    advancedHint:
      'Optional controls. Most work finishes with manifest + Build above. Expand when you need governance history, revision diffs, deep follow-up domains, older snapshots, coverage expansion, or board-identity prefs.',
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
    /** Group heading for plan diagnostics (governance + version history + pack inspection) — under Advanced. */
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
  boardIdentity: {
    sectionTitle: 'Board identity on rename',
    sectionHint:
      'Use this when you rename initiatives and want Delivery Board cards to keep the same identity key across rebuilds.',
    /** @deprecated Prefer per-initiative edit below; audit-wide toggle applies to all renames until cleared. */
    deprecatedAuditWideHint:
      'Prefer editing each initiative below. This audit-wide toggle is legacy and may be removed after rollout.',
    checkboxLabel: 'Keep Board card identity on rename',
    warningWhenOff: 'This will create a new card on the Board; the old one will be marked orphan.',
    save: 'Save identity preference',
    saveOk: 'Board identity preference saved.',
    saveFailed: 'Could not save Board identity preference.',
    initiativeSectionTitle: 'Initiatives and Board card identity',
    initiativeSectionHint:
      'Rename an initiative and optionally keep the same Delivery Board card identity (explicit opt-in per save).',
    drawerTitle: 'Edit initiative',
    titleLabel: 'Title',
    descriptionLabel: 'Description',
    saveInitiative: 'Save initiative',
    savingInitiative: 'Saving…',
    saveInitiativeOk: 'Initiative updated.',
    saveInitiativeFailed: 'Could not save initiative.',
    cancel: 'Cancel',
    editButton: 'Edit',
    bucketQuickWins: 'Quick wins',
    bucketMediumTerm: 'Medium-term initiatives',
    bucketStrategic: 'Strategic initiatives',
  },
} as const;

/**
 * Logical groupings over {@link STRATEGY_LAB_COPY} (references only — no duplicated strings).
 * Use for tooling, docs navigation, or future role-scoped loaders without breaking existing imports.
 */
export const STRATEGY_LAB_COPY_CONTEXT = {
  iaPhasesOnPage: STRATEGY_LAB_COPY.iaPhasesNav,
  consultantWorkbench: STRATEGY_LAB_COPY.workbenchSegment,
  journey: STRATEGY_LAB_COPY.journeyStrip,
  planSurfaces: {
    segmentedNav: STRATEGY_LAB_COPY.planViewSegment,
    breadcrumb: STRATEGY_LAB_COPY.planSurfaceBreadcrumb,
    manifestWizardChrome: STRATEGY_LAB_COPY.manifestWizardChrome,
  },
  orchestrationLab: STRATEGY_LAB_COPY.orchestrationDisclosure,
  orchestrationWorkflowStatus: STRATEGY_LAB_COPY.orchestrationWorkflowStatus,
  orchestrator: STRATEGY_LAB_COPY.orchestratorTabs,
  planSummary: STRATEGY_LAB_COPY.panel,
  benchmarksAndReference: STRATEGY_LAB_COPY.referenceDisclosure,
  constraints: STRATEGY_LAB_COPY.constraints,
  packDependencyMap: STRATEGY_LAB_COPY.packDependencyMap,
  depthFilter: STRATEGY_LAB_COPY.depthFilter,
  directorStage2: STRATEGY_LAB_COPY.directorStage2Intent,
  boardIdentity: STRATEGY_LAB_COPY.boardIdentity,
  errorsLoading: STRATEGY_LAB_COPY.messages,
  appChrome: STRATEGY_LAB_COPY.appShell,
} as const;
