/**
 * Strategy Lab — unified roadmap / orchestration UI copy (English).
 */

import type {
  OrchestrationChangeScenario,
  OrchestrationPreviewCompressionHint,
  OrchestrationPreviewLaneDensityBand,
  OrchestrationSeasonPreset,
} from './orchestration-roadmap-manifest';
import type { OrchestrationManifestState, OrchestrationTimelineStatus } from './orchestration-contract';

export const ORCHESTRATION_UI_COPY = {
  sectionTitle: 'Roadmap input',
  sectionHint:
    'Confirm how you want to execute changes and the planning window. Coverage must match this audit’s execution plan.',
  coverageLabel: 'Coverage (from audit)',
  scenarioLabel: 'Change scenario',
  seasonLabel: 'Planning window',
  planHorizonLabel: 'Plan dates (optional)',
  planHorizonStartLabel: 'Start (YYYY-MM-DD)',
  planHorizonEndLabel: 'End (YYYY-MM-DD)',
  planHorizonHint:
    'When both dates are valid, seasonal buckets map the critical path onto this calendar window using your planning preset. Leave blank to use the length-based split only.',
  previewTitle: 'Preview',
  previewDomains: 'Domains in scope',
  previewScenario: 'Scenario',
  previewSeason: 'Window',
  previewLoading: 'Updating preview…',
  previewFailed: 'Preview failed. Check manifest values and try again.',
  previewLanesIncluded: 'Lanes in scope',
  previewLanesCut: 'Lanes outside current coverage',
  previewWaitingList: 'Waiting list (not in this audit)',
  /** Shown when cross-domain conflict synthesis may be evidence-limited. */
  conflictSynthesisNote:
    'When the roadmap lists “synthesis” trade-offs, some rows may be marked as pending: that means the system is holding a hypothesis until intake or domain evidence fills the gap. It is not a fact-checker claim for the whole plan.',
  previewCompression: 'Execution compression hint',
  previewDensity: 'Planning density',
  roadmapVersionLabel: 'Roadmap version',
  revisionDiffTitle: 'Last plan change',
  revisionHistoryTitle: 'Version history',
  revisionHistoryRowAriaTemplate:
    'Orchestration pack revision from roadmap version {from} to version {to}. Initiatives added {nodesAdded}, removed {nodesRemoved}. Dependencies added {edgesAdded}, removed {edgesRemoved}.',
  revisionCompareLabel: 'Compare',
  snapshotHistoryTitle: 'Manifest snapshot history',
  snapshotHistoryLabel: 'Snapshot',
  snapshotHistoryEmpty: 'No saved snapshots yet',
  snapshotAutoSelected: 'Loaded latest manifest snapshot',
  snapshotVersionHint:
    'Build only works with the newest saved manifest (server contract). Use history to inspect older settings; the Build button will use the latest row when it differs from your selection.',
  /** Shown when user had a non-latest snapshot selected but the run used the newest one */
  buildUsesLatestSnapshot: 'Using the latest saved manifest snapshot (required to build the pack).',
  revisionNodesAdded: 'Initiatives added',
  revisionNodesRemoved: 'Initiatives removed',
  revisionCriticalPathChanged: 'Critical path changed',
  revisionCriticalPathUnchanged: 'Critical path unchanged',
  revisionLaneChanges: 'Lane changes',
  revisionLaneChangeRow: 'moved lane',
  revisionEdgesAdded: 'Dependencies added',
  revisionEdgesRemoved: 'Dependencies removed',
  revisionConflictsResolvedCounts: 'Synthesis conflict count (before → after)',
  revisionDiffTruncated: 'Additional rows omitted for readability',
  confirmSaveManifest: 'Save manifest snapshot',
  /** Primary Strategy Lab CTA — snapshot + pack in one server call. */
  compilePlan: 'Compile plan',
  compilePlanStatusCompiling: 'Compiling roadmap…',
  compilePlanStatusDone: 'Last compiled: pack v{version}',
  compilePlanStatusIdleHint: 'Compile saves a new manifest snapshot and rebuilds the orchestration pack.',
  saveManifestSnapshotOnly: 'Save manifest snapshot only',
  buildPack: 'Build orchestration pack',
  buildPackNeedsManifestSync: 'Save manifest changes before rebuilding roadmap',
  manifestSaved: 'Manifest snapshot saved',
  packBuilt: 'Orchestration pack saved',
  manifestSaveFailed: 'Could not save manifest',
  manifestDraftQueueBanner:
    'Delivery Board lane or owner hints are queued for signing. Save the manifest snapshot below to merge them into the roadmap contract.',
  manifestDraftLaneQueuedToast: 'Execution hint queued. Save manifest snapshot in Strategy Lab to sign it.',
  /** Strategy Lab — POST orchestration pack failed */
  packBuildFailed: 'Could not build orchestration pack',
  /** 409 from plan governance: title line (body lists blocking reason codes in toast description) */
  packBuildGovernanceBlockedTitle: 'Plan quality checks blocked saving the roadmap',
  /** Timeline page — GET /timeline failed (network, 4xx, 5xx); not the same as a missing pack */
  timelineLoadFailed: 'Could not load execution timeline',
  timelineTitle: 'Execution timeline',
  timelineHint: 'Critical path grouped into planning buckets; lanes show parallel tracks.',
  /** Consultant / client Plan surface — roadmap (Gantt) AppShell chrome */
  planRoadmapShellTitle: 'Plan · Roadmap',
  planRoadmapShellSubtitle: 'Multi-lane schedule with dependencies and task detail.',
  planRoadmapLoadingSubtitle: 'Loading plan data…',
  /** Roadmap shell — audit row not ready yet */
  planRoadmapLoadingAuditSubtitle: 'Loading audit…',
  /** Roadmap shell — audit present, timeline API still in flight */
  planRoadmapLoadingTimelineSubtitle: 'Loading schedule data…',
  /** Shared loading detail under icon — Roadmap + Timeline plan surfaces */
  planSurfaceLoadingDetail: 'Fetching execution timeline for this audit…',
  planSurfaceMissingAuditId: 'Missing audit id.',
  planRoadmapErrorSubtitle: 'Plan data unavailable',
  planRoadmapLoadErrorBody: 'Could not load timeline data for this audit. Check your connection or return to Strategy Lab.',
  planRoadmapTimelineQueryFailedBody:
    'The timeline request failed before we could render the schedule. Retry from Strategy Lab after checking your connection.',
  planRoadmapBackToStrategyCta: 'Open Strategy Lab',
  /** Timeline / Plan chrome — audit refetch failed but cached audit row is still shown */
  planAuditStaleDataBanner:
    'Audit data could not be refreshed. You are seeing the last loaded information. Try again or reload the page.',
  /** Single-line “next” hint replacing numbered quick-start + flow mini tiles in Strategy Lab */
  strategyLabNextActionInline:
    'Next: tune scenario and planning window, save a manifest snapshot, then build the pack. Open Plan for the Board, Gantt Roadmap, or Table list.',
  /** Execution realism — plan sequencing vs people/calendar capacity. */
  timelineExecutionRealismNote:
    'This view sequences work by dependencies and lanes — it does not replace team capacity planning, FTE load, or your real sprint calendar.',
  timelineStateMissingPack:
    'No execution pack is saved yet, so the seasonal timeline is empty. Your consultant confirms scope in Strategy Lab, saves a manifest snapshot, then builds the pack — after that, this view fills in automatically.',
  /** Prominent empty-state title when pack is missing or manifest is stale */
  timelineEmptyCalloutTitle: 'Timeline not populated yet',
  timelineEmptyCalloutClientHint:
    'Your consultant confirms the roadmap manifest in Strategy Lab and builds the execution pack. You can keep this page open — it updates automatically once the pack is saved.',
  timelineEmptyCtaOpenReport: 'Open full report',
  timelineEmptyCtaAuditOverview: 'Audit overview',
  /** Legacy one-liner; prefer `timelineStateDegradedTitle` + `timelineStateDegradedLead` in UI */
  timelineStateDegraded: 'Timeline is available with degraded input coverage.',
  timelineStateDegradedTitle: 'Roadmap is visible, but input quality is reduced',
  timelineStateDegradedLead:
    'The saved plan can still be read here. “Degraded” means some cross-checks are missing (see below) — often because domain director enrichments are absent or only partial, or because confidence / risk is incomplete on some steps.',
  timelineDegradedFallbackDirectorMissing:
    'No domain director layer on this build: the graph uses strategy initiatives only. This is expected when director output is off or not yet re-run for all domains.',
  timelineDegradedFallbackDirectorPartial:
    'Director coverage is partial: some areas still fall back to strategy-only actions. Rebuild the pack in Strategy Lab after domain coverage improves.',
  timelineDegradedFallbackDirectorInvalid:
    'Some domain director data could not be read; sequencing may omit expected links. Rebuild after fixing domain outputs or saving a new manifest.',
  timelineDegradedEmptySeasonBucketsHint:
    'Seasonal buckets can look empty if steps are not yet split across the time windows. Check the Workstreams tab — initiatives are still listed by lane.',
  timelineDegradedDataGapsSectionTitle: 'What is missing (from this plan run)',
  /** Plan map tab when pack exists but status is degraded (graph is still available) */
  timelinePlanMapDegradedNote:
    'Input quality is reduced, but the dependency map still reflects the saved pack. Use it together with the data gaps list above.',
  timelineStateStaleManifest: 'Timeline is stale relative to latest manifest snapshot.',
  /** Extra client copy when pack exists but manifest moved forward (API status `stale_manifest`). */
  timelineStaleManifestClientHint:
    'The timeline you see may not match the latest roadmap manifest. Ask your consultant to confirm scope in Strategy Lab and rebuild the execution pack.',
  timelineStateRestricted: 'This view is restricted to client-safe roadmap fields.',
  /** Consultant-only: internal API status from `GET /timeline` (paired with human message in technical block). */
  timelineDiagnosticReasonLabel: 'Timeline API status',
  /** `<details>` summary for consultant diagnostics on the portal timeline. */
  timelineConsultantTechnicalSummary: 'Internal diagnostics (consultant)',
  /** Portal timeline — primary hero heading when the timeline is ready. */
  portalTimelineHeroTitle: 'Your plan at a glance',
  /** Client — short guidance under the hero when the timeline is ready. */
  timelineNextStepReadyClient:
    'Start with near-term priorities below. Open your full report anytime for evidence and scores.',
  /** Consultant — short guidance under the hero when the timeline is ready. */
  timelineNextStepReadyConsultant:
    'Review buckets and dependencies, then adjust scope or rebuild the pack in Strategy Lab if needed.',
  /** Portal timeline — tab labels (IA: fewer simultaneous panels). */
  portalTimelineTabOverview: 'Overview',
  portalTimelineTabWorkstreams: 'Workstreams',
  portalTimelineTabDependencies: 'Dependencies',
  portalTimelineTabPlanMap: 'Plan map',
  /** Portal timeline — Now / Next / Later board (v9). */
  portalTimelineTabNowNextLater: 'Now · Next · Later',
  nowNextLaterNow: 'Now',
  nowNextLaterNext: 'Next',
  nowNextLaterLater: 'Later',
  nowNextLaterEmpty: 'No items in this bucket yet.',
  /** Overview tab — compact plan metadata when the hero is not shown (non-ready timelines). */
  portalTimelinePlanSnapshotTitle: 'Plan snapshot',
  /** Plan map tab — no pack on audit / strategy payload missing. */
  timelinePlanMapUnavailableHint: 'The interactive map needs a saved orchestration pack on this audit. Build it in Strategy Lab if it is not saved yet.',
  /** Screen-reader-only legend for the interactive dependency map (keyboard and zoom). */
  timelinePackGraphSrKeyboardHint:
    'Interactive diagram: use mouse or trackpad to pan and zoom. Toolbar controls are reachable with Tab.',
  timelineWaitingListTitle: 'Waiting list',
  timelineDependenciesTitle: 'Cross-lane dependencies',
  timelineBlockingDepsTitle: 'Blocking dependencies',
  timelineParallelTracksTitle: 'Parallel tracks',
  timelineSyncMarkersTitle: 'Sync markers',
  timelineSyncMarkerCrossLane: 'Cross-lane sync',
  timelineManifestFlowTitle: 'Change roadmap coverage',
  timelineManifestFlowHint:
    'Preview manifest, save a snapshot, then build the next roadmap version (vN+1). Consultants complete this in Strategy Lab.',
  timelineManifestFlowCta: 'Open manifest flow in Strategy Lab',
  timelineManifestStaleCta: 'Manifest is stale — open Strategy Lab to confirm and rebuild',
  timelineNoDeps: 'No dependencies in current projection.',
  /** Portal timeline — pack-backed dependency map + DOT export (V5). */
  timelinePackGraphSectionTitle: 'Plan dependency map',
  timelinePackGraphSectionHint:
    'From the saved orchestration pack: interactive map (pan and zoom), ordered critical path, then cross-lane links (prioritized). Copy Graphviz DOT to export.',
  timelinePackGraphCanvasLoading: 'Loading graph…',
  timelinePackGraphInteractiveTitle: 'Interactive map',
  timelinePackGraphInteractiveHint:
    'Drag the background to pan, use controls to zoom. Pick a step below or a node on the map to focus it — the view recenters on that initiative. Critical path links are highlighted; other links show cross-initiative dependencies.',
  timelinePackGraphFlowEdgesTruncated:
    'Some links are omitted from the interactive map for performance; the list and DOT export use separate budgets.',
  timelinePackGraphFlowNodesTruncated:
    'Some initiatives are hidden on the map due to the node budget; the critical path is always kept.',
  timelinePackGraphCriticalPathBadge: 'Critical path',
  timelinePackGraphHandleTargetAria: 'Dependency target',
  timelinePackGraphHandleSourceAria: 'Dependency source',
  timelinePackGraphInteractiveAriaLabel: 'Interactive plan dependency map',
  timelinePackGraphExpandMap: 'Show more on map',
  timelinePackGraphCollapseMap: 'Compact map',
  timelinePackGraphExpandMapHint:
    'Uses a larger node and link budget for the canvas (may be slower on very large plans). Lists below stay unchanged.',
  timelinePackGraphFitViewControl: 'Fit map to view',
  timelinePackGraphClearHighlight: 'Clear map selection',
  timelinePackGraphListHighlightCpAria: 'Highlight on map',
  timelinePackGraphListHighlightEdgeAria: 'Highlight endpoints on map',
  timelinePackGraphCriticalPathTitle: 'Critical path',
  timelinePackGraphEdgesTitle: 'Key dependency links',
  timelinePackGraphEdgesTruncated: 'Some links are hidden here for readability; export uses a separate edge budget.',
  timelinePackGraphCopyDot: 'Copy Graphviz DOT',
  timelinePackGraphCopyDotSuccess: 'DOT copied to clipboard',
  timelinePackGraphCopyDotFailed: 'Could not copy (browser blocked clipboard)',
  timelineDecisionCardSummary: 'Decision context',
  timelineDecisionWhyLabel: 'Why',
  timelineDecisionHowLabel: 'How',
  timelineDecisionTimeLabel: 'Time',
  timelineDecisionImpactLabel: 'Impact',
  timelineDecisionRisksLabel: 'Risks',
  initiativeOutcomeLabel: 'Expected outcome',
  strategyRoadmapEyebrow: 'Strategic roadmap',
  strategyRoadmapTitle: 'Implementation timeline',
  strategyRoadmapQuickWinsTitle: 'Quick wins',
  strategyRoadmapQuickWinsWindow: '<= 1 week',
  strategyRoadmapMediumTermTitle: 'Medium term',
  strategyRoadmapMediumTermWindow: 'About 1 month',
  strategyRoadmapStrategicTitle: 'Strategic initiatives',
  strategyRoadmapStrategicWindow: '1-3 months',
  strategyRoadmapDependenciesLabel: 'Dependencies',
  strategyRoadmapEmptyTimeframe: 'No initiatives in this timeframe',
  timelineMilestonesTitle: 'Milestones',
  /** Milestone section — sublabel for which initiatives unlock at this tranche. */
  milestoneUnlocksLabel: 'Unblocks',
  /** Client CTA: reorder pack priorities to put this action first (POST orchestration pack + selected_action_ids). */
  initiativeMarkNextStepCta: 'Mark as my next step',
  initiativeMarkNextStepBusy: 'Saving…',
  initiativeMarkNextStepSuccess: 'This step is now highlighted first in your plan.',
  initiativeMarkNextStepError: 'Could not update your plan order. Try again or ask your consultant.',
  initiativeMarkNextStepUnavailable: 'A saved manifest snapshot and pack are required first.',
  topPriorityReasonLabel: 'Why now',
  timelineLimitedContextBadge: 'Limited context',
  topActionsTitle: 'Top actions',
  topActions7dLabel: 'Next 7 days',
  topActions30dLabel: 'Next 30 days',
  /** Portal timeline — saved Strategy Lab execution packs (optional server feature). */
  executionPacksSectionTitle: 'Execution detail packs',
  executionPacksSectionHint:
    'Deeper initiative breakdowns from Strategy Lab (extra AI pass). Use Detail pack on “Top actions” for a one-click request, or open Lab for multi-select and path options. Success metrics and review cadence in a pack are planning templates — track real business outcomes in your own analytics or CRM; GLC does not connect to your live data.',
  /** Portal timeline — one initiative per request; same server route as Strategy Lab execution pack. */
  executionPackFromTopActionsHint:
    'Each Detail pack request runs one on-demand AI pass (billed like Strategy Lab). One initiative per request from this view. You can start another request while one is running; each is processed separately.',
  executionPackFromTimelineCta: 'Detail pack',
  executionPackFromTimelineCtaBusy: 'Requesting…',
  executionPackFromTimelineCtaAriaLabel: 'Request execution detail pack for',
  executionPackFromTimelineSuccess: 'Detail pack saved. It appears in the list below.',
  executionPackFromTimelineFailed: 'Could not generate detail pack',
  executionPackFromTimelineErrorDisabled:
    'Detail packs are turned off in this environment. Open your report or ask your consultant.',
  executionPackFromTimelineErrorNotReady:
    'Strategy is still finishing for this audit. Try again when the report is complete.',
  executionPackFromTimelineErrorPayloadInvalid: 'This detail pack request could not be accepted.',
  executionPackFromTimelineErrorNotFound: 'This audit was not found or you no longer have access.',
  executionPackFromTimelineErrorFailedGeneric: 'Could not generate the detail pack.',
  executionPackFromTimelineErrorRateLimited: 'Too many AI requests right now. Wait a moment and try again.',
  executionPackRepeatDialogTitle: 'Request another detail pack?',
  executionPackRepeatDialogBody:
    'A detail pack for this initiative may already exist. A new request runs another on-demand AI pass and adds another row in your list.',
  executionPackRepeatDialogConfirm: 'Request new pack',
  executionPackRepeatDialogCancel: 'Cancel',
  /** Portal timeline — sync markers (V7): short cross-lane narrative when blocking cross-lane deps exist. */
  timelineCrossLaneNarrativeTitle: 'Aligning lanes before you commit dates',
  timelineCrossLaneNarrativeBody:
    'Marketing, delivery, and operations often run on different clocks. The sync links below flag where one lane must wait on another—use them to line up owners and commitments.',
  executionPacksEmpty: 'No execution detail packs saved for this audit yet.',
  executionPacksLoadError: 'Execution pack history is unavailable (feature off or network error).',
  executionPacksRowInitiativesLabel: 'initiatives',
  executionPacksCtaLab: 'Open Strategy Lab',
  /** Portal timeline — CSV download of plan rows (orchestration + latest execution pack). */
  sprintExportCsvCta: 'Download sprint plan (CSV)',
  sprintExportCsvBusy: 'Preparing file…',
  sprintExportCsvError: 'Could not download the sprint plan.',
  bucketNear: 'Near term',
  bucketMid: 'Mid term',
  bucketFar: 'Later',
  lanesTitle: 'Lanes',
  dependencyTitle: 'Key dependencies',
  dependencyHint: 'Cross-lane links are listed first; longer graphs are truncated for readability.',
  dataGapsTitle: 'Data gaps',
  dataGapFallback: 'Limited precision (strategy fallback)',
  dataGapDirectorMissing: 'Director slices are missing for part of scope.',
  dataGapDirectorPartial: 'Director slices are only partially available for this scope.',
  versionLabel: 'Pack version',
  openNodeInLab: 'Open in Lab',
  noPackYet: 'No orchestration pack yet. Save a manifest, then build the pack.',
  labDetailLayerHint:
    'Strategy Lab focuses on manifest snapshots, pack rebuilds, and node detail. Sequencing stays on the execution timeline.',
  clientHidden: 'Roadmap manifest is available to consultants on this audit.',
  clientTimelineReadOnlyHint:
    'The full seasonal timeline and lanes live in the dedicated timeline view. Open it to review ordering and dependencies, then return here for node detail.',
  clientOpenFullTimeline: 'Open timeline',
  /** Primary Plan entry (Board/Roadmap) when Timeline is no longer the default CTA. */
  clientOpenPlanSurface: 'Open Plan',
  synthesisSectionTitle: 'Orchestrator synthesis',
  synthesisSectionHint:
    'Cross-domain trade-offs from the optional synthesis pass (when enabled on the server). Deterministic graph and lanes are unchanged.',
  synthesisResolutionApplied: 'Applied',
  synthesisResolutionPending: 'Pending',
  commercialOfferTitle: 'Coverage expansion offer',
  commercialCheckCta: 'Check coverage gaps',
  commercialChecking: 'Checking coverage gaps…',
  commercialAcceptCta: 'Accept',
  commercialConfirmAcceptTitle: 'Apply coverage change?',
  commercialConfirmAcceptDescription: 'Applying expands domain coverage and recomputes the roadmap version.',
  commercialConfirmAcceptConfirm: 'Apply',
  commercialConfirmAcceptCancel: 'Cancel',
  commercialRecalculatedPrefix: 'Recalculated lanes after adding',
  commercialWhyNowTitle: 'Why now (graph-aware)',
  commercialBeforeAfterTitle: 'Lanes before / after offer',
  commercialBeforeLabel: 'Current scope',
  commercialAfterLabel: 'If accepted',
  commercialAcceptedReviewTimeline:
    'Coverage update applied. Open Plan to review the delivery board, schedule, or seasonal view for the new roadmap version.',
  /** Legacy timeline CTA label — prefer `commercialAcceptedOpenPlanBoard` / `commercialAcceptedOpenPlanRoadmap` for primary Plan links. */
  commercialAcceptedOpenTimeline: 'Open execution timeline',
  /** CTA when Delivery Board rollout is active (explicit links). */
  commercialAcceptedOpenPlanBoard: 'Open delivery board',
  /** CTA when Board is off — schedule is primary. */
  commercialAcceptedOpenPlanRoadmap: 'Open roadmap',
  /** Legacy seasonal lanes tab when still exposed. */
  commercialAcceptedOpenPlanTimeline: 'Open execution timeline',
  commercialAcceptedCompareHint:
    'Use Plan quality and history (Advanced) to compare this pack to the previous version.',
  governanceTitle: 'Plan governance',
  governanceDecisionHintLabel: 'Decision hint',
  governanceInputHeaderLabel: 'Input quality gate',
  governanceReasonHintTitle: 'What to fix before next run',
  governanceScoresLabel: 'Integrity / confidence / risk',
  governanceCriticalPathCoverageLabel: 'Critical path coverage',
  /** Consultant orchestration cockpit — rebuild pack from last committed manifest (POST /orchestration/pack). */
  consultantCockpitRegeneratePackCta: 'Rebuild plan from latest manifest',
  consultantCockpitRegeneratePackBusy: 'Rebuilding…',
  consultantCockpitRegeneratePackSuccess: 'Plan rebuilt from the latest manifest.',
  consultantCockpitRegeneratePackError: 'Could not rebuild the plan.',
  consultantCockpitNoManifest:
    'No committed manifest snapshot yet. Open the roadmap manifest flow, then return here.',
  consultantCockpitRefineCta: 'Open manifest & Strategy Lab',
  consultantCockpitGovernanceHint:
    'Server-side governance runs when the pack is built. Rebuild to refresh scores, or change inputs in the manifest wizard / Strategy Lab.',
  consultantCockpitAcceptPlan: 'Accept plan',
  consultantCockpitAcceptWithWarnings: 'Accept with warnings',
  consultantCockpitRefinePlan: 'Refine plan',
  consultantCockpitStaleBanner: 'The plan was updated elsewhere. Refresh the page, then continue.',
  consultantCockpitGovernanceDisabled: 'Governance actions are disabled in this build.',
  consultantCockpitAppShellTitle: 'Orchestration cockpit',
  consultantCockpitAppShellSubtitle: 'Read-only pack, governance, and critical path (same API as the client portal).',
  consultantCockpitLoadingLabel: 'Loading…',
  consultantCockpitLoadError: 'Could not load orchestration data.',
  consultantCockpitNoPackBody: 'No pack persisted for this audit yet.',
  consultantCockpitCriticalPathHeading: 'Critical path',
  consultantCockpitInitiativesHeading: 'Initiatives',
  consultantCockpitTimelineLinkLabel: 'Timeline',
  /** Primary Plan entry from cockpit (Board/Roadmap via rollout). */
  consultantCockpitPlanLinkLabel: 'Plan',
  consultantCockpitManifestWizardLinkLabel: 'Manifest wizard',
  consultantCockpitTableColTitle: 'Title',
  consultantCockpitTableColLane: 'Lane',
  consultantCockpitTableColDomain: 'Domain',
  consultantCockpitGovernanceStatusLabel: 'status',
  consultantCockpitGovernanceRefineBanner:
    'Plan gate suggests refinement — use Manifest wizard or Strategy Lab, then rebuild.',
  consultantCockpitGovernanceRecordedToast: 'Governance action recorded',
  setAggregatorTitle: 'Selection summary',
  setAggregatorEffort: 'Effort range (days)',
  setAggregatorImpact: 'Expected impact',
  setAggregatorMinConfidence: 'Minimum confidence',
  setAggregatorRisks: 'Key risks',
  controlObjectTitle: 'Plan control object',
  controlObjectExitCriteria: 'Exit criteria',
  controlObjectEscalation: 'Escalation rules',
  scenarioCompareTitle: 'Compare scenarios',
  scenarioCompareCta: 'Compare manifest previews',
  nodeBadgeBaseline: 'Baseline',
  nodeBadgeDeep: 'Deep',
  nodeBadgeDirector: 'Director',
  nodeBadgeStrategy: 'Strategy',
  nodeBadgeSubAgent: 'Sub-agent',
  timelineSubAgentFilterLabel: 'Filter by analysis agent',
  timelineSubAgentFilterAll: 'All actions',
  deepDiveCta: 'Deepen this domain',
  deepDiveDialogTitle: 'Deepen this domain',
  deepDiveDialogDescription: 'Run a focused director pass with your business context.',
  deepDiveQuotaLabel: 'Deep-dive runs for this domain (this audit’s package):',
  deepDivePackageBadgePrefix: 'Package:',
  deepDivePackageLabel_starter: 'Starter',
  deepDivePackageLabel_pro: 'Pro',
  deepDivePackageLabel_complete: 'Complete',
  deepDiveQuotaExhaustedHint:
    'You have used all deep-dive runs for this domain on this audit. Upgrade your package in checkout to get more per-domain deep-dives.',
  deepDiveQuotaLoading: 'Loading quota…',
  deepDiveQuotaUnavailable: 'Quota unavailable',
  deepDiveIntakePrefillHint: 'Prefilled from your intake where answers exist — edit as needed.',
  deepDiveGoalsLabel: 'Goals (one per line)',
  deepDiveConstraintsLabel: 'Constraints (one per line)',
  deepDiveEstimatedTimeLabel: 'Estimated time',
  deepDiveEstimatedTimeMinutesSuffix: 'min',
  deepDiveStatusLabel: 'Status',
  deepDiveJobPrefix: 'Job',
  deepDiveErrorFallback: 'Deep-dive request failed',
  deepDiveGoalsRequired: 'Add at least one goal to start.',
  deepDiveStartCta: 'Start deep-dive',
  deepDiveModeLabel: 'Operating mode',
  deepDiveModeAuto: 'Auto',
  deepDiveMode_discovery: 'Discovery',
  deepDiveMode_launch: 'Launch',
  deepDiveMode_growth: 'Growth',
  deepDiveMode_authority: 'Authority',
  deepDiveMode_defense: 'Defense',
  deepDiveAgentPickerLabel: 'Choose analysis agents',
  deepDiveAgentPickerHint: 'Pick specific agents or leave all unchecked to auto-select.',
  deepDiveSubAgentLabelPrefix: 'CMO',
  deepDiveEstimatedTimeMinutes: 'about 4 minutes',
  deepDiveCloseCta: 'Close',
  deepDiveErrorFeatureDisabled: 'Deep-dive is currently disabled in this environment.',
  deepDiveErrorPayloadInvalid: 'Deep-dive request payload is invalid. Update the inputs and try again.',
  deepDiveErrorIdempotencyMismatch: 'This retry key was already used with different inputs. Start a new request.',
  deepDiveErrorQuotaExceeded: 'Deep-dive quota is reached for this domain and package.',
  deepDiveErrorTokenBudgetExceeded: 'Selected mode and agent depth exceed package token budget for deep-dive.',
  deepDiveErrorJobNotFound: 'Deep-dive job is not available or no longer accessible.',
  deepDiveErrorFailed: 'Deep-dive execution failed. Try again in a few minutes.',
  deepDiveErrorDeadLetter: 'Deep-dive request moved to dead letter. Contact support if it keeps happening.',
  deepDiveQaBlockTitle: 'Deep-dive quality check',
  deepDiveQaTop3Label: 'Top 3 actions',
  deepDiveQaRisksLabel: 'Risks',
  deepDiveQaMeasurementLabel: 'Measurement',
  subAgent_cmo_agent_1_market_title: 'Agent 1 Market',
  subAgent_cmo_agent_1_market_description: 'Maps market thesis, alternatives, and risks.',
  subAgent_cmo_agent_2_awareness_ladder_title: 'Agent 2 Awareness ladder',
  subAgent_cmo_agent_2_awareness_ladder_description: 'Defines awareness stages and the next best message.',
  subAgent_cmo_agent_3_positioning_title: 'Agent 3 Positioning',
  subAgent_cmo_agent_3_positioning_description: 'Defines target niche and positioning statement.',
  subAgent_cmo_agent_4_voice_title: 'Agent 4 Voice',
  subAgent_cmo_agent_4_voice_description: 'Sets tone, vocabulary, and banned phrases for consistent messaging.',
  subAgent_cmo_agent_5_content_strategy_title: 'Agent 5 Content Strategy',
  subAgent_cmo_agent_5_content_strategy_description: 'Builds topic backlog and funnel-aligned content plan.',
  subAgent_cmo_agent_6_viral_title: 'Agent 6 Viral',
  subAgent_cmo_agent_6_viral_description: 'Proposes attention hooks and early-stage creative angles.',
  subAgent_cmo_agent_7_storytelling_title: 'Agent 7 Storytelling',
  subAgent_cmo_agent_7_storytelling_description: 'Selects story frameworks and example hooks for narratives.',
  subAgent_cmo_agent_8_ready_posts_title: 'Agent 8 Ready-to-publish',
  subAgent_cmo_agent_8_ready_posts_description: 'Drafts post outlines with channel and CTA.',
  subAgent_cmo_agent_9_traffic_title: 'Agent 9 Traffic',
  subAgent_cmo_agent_9_traffic_description: 'Creates acquisition hypotheses with dependencies and priorities.',
  subAgent_cmo_agent_10_distribution_title: 'Agent 10 Distribution',
  subAgent_cmo_agent_10_distribution_description: 'Maps channel roles and priorities across the system.',
  subAgent_cmo_agent_11_founder_brand_title: 'Agent 11 Founder brand',
  subAgent_cmo_agent_11_founder_brand_description: 'Defines narrative pillars and visibility tactics for founders.',
  subAgent_cmo_agent_12_growth_loops_title: 'Agent 12 Growth loops',
  subAgent_cmo_agent_12_growth_loops_description: 'Identifies compounding loops and North Star metrics.',
  subAgent_cdo_user_intent_title: 'CDO — User intent (JTBD)',
  subAgent_cdo_user_intent_description: 'Clarifies jobs-to-be-done, switching triggers, and intent mismatches.',
  subAgent_cdo_funnel_architect_title: 'CDO — Funnel architect',
  subAgent_cdo_funnel_architect_description: 'Defines funnel stages, entry metrics, and primary conversion events.',
  subAgent_cdo_value_proposition_title: 'CDO — Value proposition',
  subAgent_cdo_value_proposition_description: 'Assesses first-screen clarity, specificity, and message hierarchy.',
  subAgent_cdo_friction_title: 'CDO — Friction analyst',
  subAgent_cdo_friction_description: 'Maps friction points with measurable signals and severity.',
  subAgent_cdo_trust_credibility_title: 'CDO — Trust and credibility',
  subAgent_cdo_trust_credibility_description: 'Finds reassurance gaps, social proof issues, and perceived risk blockers.',
  subAgent_cdo_behavioral_psychology_title: 'CDO — Behavioral psychology',
  subAgent_cdo_behavioral_psychology_description:
    'Applies ethical behavioral levers to reduce resistance and increase motivated action.',
  subAgent_cdo_ui_consistency_title: 'CDO — UI consistency and usability',
  subAgent_cdo_ui_consistency_description:
    'Audits hierarchy, scanability, and pattern consistency for conversion-critical flows.',
  subAgent_cdo_copy_microcopy_title: 'CDO — Copy and microcopy',
  subAgent_cdo_copy_microcopy_description:
    'Improves CTA, form, and state messaging to reduce hesitation and abandonment.',
  subAgent_cdo_experimentation_title: 'CDO — Experimentation',
  subAgent_cdo_experimentation_description: 'Prioritizes tests with metrics, cost, and decision windows.',
  subAgent_cdo_analytics_tracking_title: 'CDO — Analytics and tracking',
  subAgent_cdo_analytics_tracking_description:
    'Defines missing events, funnel instrumentation, and metric contracts.',
  subAgent_cdo_benchmark_patterns_title: 'CDO — Benchmark patterns',
  subAgent_cdo_benchmark_patterns_description:
    'Maps ethical, adaptable industry patterns relevant to the current product context.',
  subAgent_cao_process_map_title: 'CAO — Process map',
  subAgent_cao_process_map_description: 'Documents critical paths, owners, and handoffs for automation goals.',
  subAgent_cao_sop_governance_title: 'CAO — SOP and approval governance',
  subAgent_cao_sop_governance_description:
    'Defines SOP ownership, approval boundaries, and escalation control points.',
  subAgent_cao_sla_targets_title: 'CAO — SLA and response targets',
  subAgent_cao_sla_targets_description:
    'Sets measurable response and handoff targets with breach visibility rules.',
  subAgent_cao_data_quality_gates_title: 'CAO — Data quality gates',
  subAgent_cao_data_quality_gates_description:
    'Establishes intake and workflow data checks required before automation steps.',
  subAgent_cao_adoption_rollout_governance_title: 'CAO — Adoption and rollout governance',
  subAgent_cao_adoption_rollout_governance_description:
    'Plans staged rollout controls, ownership readiness, and change adoption risk.',
  subAgent_cao_automation_candidates_title: 'CAO — Automation candidates',
  subAgent_cao_automation_candidates_description: 'Ranks automation opportunities with rationale and expected deltas.',
  subAgent_cao_integrations_handoffs_title: 'CAO — Integrations and handoffs',
  subAgent_cao_integrations_handoffs_description:
    'Maps system handoff points, sync rules, and dependency risks across tools.',
  subAgent_cao_followup_notifications_title: 'CAO — Follow-up and notifications',
  subAgent_cao_followup_notifications_description:
    'Designs reminder, escalation, and notification logic for process reliability.',
  subAgent_cao_billing_quote_automation_title: 'CAO — Billing and quote workflows',
  subAgent_cao_billing_quote_automation_description:
    'Prioritizes billing and quote automations with controls for exceptions and approvals.',
  subAgent_cao_ai_ops_guardrails_title: 'CAO — AI-assisted operations guardrails',
  subAgent_cao_ai_ops_guardrails_description:
    'Defines where AI assists operations safely, with human review and fallback rules.',
  subAgent_cao_throughput_title: 'CAO — Throughput & WIP',
  subAgent_cao_throughput_description: 'Surfaces throughput risks and WIP guardrails aligned to constraints.',
  subAgent_cao_build_vs_buy_title: 'CAO — Build vs buy',
  subAgent_cao_build_vs_buy_description:
    'Compares platform choices by flexibility, reliability risk, and operating cost.',
  subAgent_cao_synthesis_bundle_title: 'CAO — Synthesis bundle',
  subAgent_cao_synthesis_bundle_description:
    'Combines dependencies, 30/90 plan, KPI/ROI path, and risk register into one program.',
  subAgent_cso_case_classifier_title: 'CSO — Case classifier',
  subAgent_cso_case_classifier_description: 'Locks scope and case assumptions before threat and compliance work.',
  subAgent_cso_threat_model_title: 'CSO — Threat model',
  subAgent_cso_threat_model_description: 'Summarizes top threat vectors with impact context.',
  subAgent_cso_compliance_map_title: 'CSO — Compliance map',
  subAgent_cso_compliance_map_description: 'Prioritizes controls and compliance actions for the selected case.',
  subAgent_cso_attack_surface_map_title: 'CSO — Attack surface map',
  subAgent_cso_attack_surface_map_description:
    'Maps externally reachable and trust-boundary surfaces before risk scoring.',
  subAgent_cso_risk_scoring_title: 'CSO — Risk scoring',
  subAgent_cso_risk_scoring_description:
    'Ranks priority risks using likelihood and impact scoring for execution order.',
  subAgent_cso_exploitability_exposure_title: 'CSO — Exploitability and exposure',
  subAgent_cso_exploitability_exposure_description:
    'Classifies practical exploitability against exposure context to avoid security theater.',
  subAgent_cso_metrics_framework_title: 'CSO — Metrics framework',
  subAgent_cso_metrics_framework_description:
    'Defines security and compliance KPI structure for continuous program tracking.',
  subAgent_cso_incident_readiness_title: 'CSO — Incident readiness',
  subAgent_cso_incident_readiness_description:
    'Prioritizes incident preparedness actions for detection, triage, and continuity.',
  subAgent_cso_sdlc_access_governance_title: 'CSO — SDLC and access governance',
  subAgent_cso_sdlc_access_governance_description:
    'Hardens engineering controls and access governance with measurable guardrails.',
  subAgent_cto_readiness_baseline_title: 'CTO — Readiness baseline',
  subAgent_cto_readiness_baseline_description:
    'Summarizes architecture readiness, fragility zones, and top delivery unknowns.',
  subAgent_cto_architecture_risk_model_title: 'CTO — Architecture risk model',
  subAgent_cto_architecture_risk_model_description:
    'Identifies structural coupling, single points of failure, and highest-risk debt.',
  subAgent_cto_reliability_runtime_title: 'CTO — Reliability and runtime',
  subAgent_cto_reliability_runtime_description:
    'Defines resilience gaps and runtime guardrails for stable operation.',
  subAgent_cto_observability_incident_title: 'CTO — Observability and incidents',
  subAgent_cto_observability_incident_description:
    'Audits detect-triage-resolve readiness and minimum telemetry coverage.',
  subAgent_cto_delivery_release_safety_title: 'CTO — Delivery and release safety',
  subAgent_cto_delivery_release_safety_description:
    'Hardens CI/CD, rollback discipline, and deployment risk controls.',
  subAgent_cto_security_supply_chain_title: 'CTO — Security supply chain',
  subAgent_cto_security_supply_chain_description:
    'Surfaces practical supply-chain and environment hygiene controls.',
  subAgent_cto_data_platform_resilience_title: 'CTO — Data platform resilience',
  subAgent_cto_data_platform_resilience_description:
    'Prioritizes durability, recovery, and migration safety improvements.',
  subAgent_cto_roadmap_tradeoffs_title: 'CTO — Roadmap trade-offs',
  subAgent_cto_roadmap_tradeoffs_description:
    'Synthesizes speed/reliability trade-offs into a staged critical path.',
  subAgent_seo_visibility_baseline_title: 'SEO — Visibility baseline',
  subAgent_seo_visibility_baseline_description:
    'Captures current visibility shape, key constraints, and missing evidence.',
  subAgent_seo_technical_indexability_title: 'SEO — Technical indexability',
  subAgent_seo_technical_indexability_description:
    'Prioritizes crawl/index/render fixes with regression guardrails.',
  subAgent_seo_ia_internal_links_title: 'SEO — IA and internal links',
  subAgent_seo_ia_internal_links_description:
    'Improves discoverability via information architecture and link pathways.',
  subAgent_seo_content_intent_coverage_title: 'SEO — Content intent coverage',
  subAgent_seo_content_intent_coverage_description:
    'Maps intent gaps and prioritizes funnel-aligned content opportunities.',
  subAgent_seo_serp_ctr_levers_title: 'SEO — SERP CTR levers',
  subAgent_seo_serp_ctr_levers_description:
    'Finds snippet/title/meta opportunities that improve qualified clicks.',
  subAgent_seo_authority_trust_title: 'SEO — Authority and trust',
  subAgent_seo_authority_trust_description:
    'Strengthens credibility signals required for high-risk intent areas.',
  subAgent_seo_local_international_readiness_title: 'SEO — Local/international readiness',
  subAgent_seo_local_international_readiness_description:
    'Validates location/language architecture before geography scaling.',
  subAgent_seo_measurement_experimentation_title: 'SEO — Measurement and experimentation',
  subAgent_seo_measurement_experimentation_description:
    'Defines KPI tree and SEO experiment backlog with rollout-safe scope.',
  /** Evidence taxonomy (director Layer 1); compact badges on timeline / pack panel (V6). */
  evidenceTaxonomyGroupAriaLabel: 'Evidence taxonomy counts',
  evidenceTaxonomyObservedAbbr: 'O',
  evidenceTaxonomyDerivedAbbr: 'D',
  evidenceTaxonomyAssumedAbbr: 'A',
  evidenceTaxonomyMissingAbbr: 'M',
  evidenceTaxonomyObservedTitle: 'Observed — site or collector-backed signals',
  evidenceTaxonomyDerivedTitle: 'Derived — inferred from other evidence',
  evidenceTaxonomyAssumedTitle: 'Assumed — working hypothesis without direct proof',
  evidenceTaxonomyMissingTitle: 'Missing — explicit gap called out',
  evidenceDrilldownTitle: 'Evidence drill-down',
  evidenceRefsLabel: 'References',
  evidenceRefsEmpty: 'No typed evidence references on this node yet (counts may still be populated).',
  clientCockpitEvidenceBreakdownTitle: 'Evidence mix (plan scope)',
  clientCockpitEvidenceBreakdownBody:
    'Aggregated observed / derived / assumed / missing counts across initiatives in your current orchestration pack.',
  /** Placeholder for empty season/lane/top lists */
  timelineEmptyListMarker: '—',
  timelineManifestStateLabel: 'Manifest state:',
  /** Shown next to manifest state when API returns `version.season_preset` */
  timelinePlanningWindowLabel: 'Planning window',
  timelineRoadmapVersionPrefix: 'Roadmap v',
  dataGapsMissingConfidenceLabel: 'Missing confidence:',
  dataGapsMissingRiskLabel: 'Missing risk:',
  dataGapsDanglingDependenciesLabel: 'Dangling dependencies:',
  roadmapSelectedScopeLabel: 'Scope: {count} selected domain{pluralSuffix}',
  roadmapPlanningWindowLabel: 'Planning window: {days} days',
  /** Client label when manifest state is unknown to the UI mapping (legacy payloads). */
  timelineManifestStateUnknown: 'Roadmap status: see your consultant if this looks wrong.',
  marketingTeaserTitle: 'Get a delivery-ready roadmap',
  marketingTeaserBody:
    'Every package now includes a client-friendly execution narrative with phases, milestones, and next priorities.',
  /** Portal roadmap Gantt — bars, milestones, tooltips */
  roadmapGanttCriticalPathBadge: 'On critical path',
  roadmapGanttOverdueBadge: 'Overdue',
  roadmapGanttOverdueEndedPrefix: 'Plan target ended',
  roadmapGanttTopPriority7dBadge: 'Top priority · 7d',
  roadmapGanttTopPriority30dBadge: 'Top priority · 30d',
  roadmapGanttCrossLaneLabel: 'Cross-lane sync',
  roadmapGanttCriticalPathFilterLabel: 'Critical path only',
  roadmapGanttCriticalPathPresetLabel: 'Preset: Critical path',
  roadmapGanttMilestonesLaneTitle: 'Milestones',
  roadmapGanttBlocksLabel: 'Blocks',
  roadmapGanttBlockedByLabel: 'Blocked by',
  roadmapGanttDurationDaysSuffix: 'd',
  roadmapGanttUnlocksLabel: 'Unlocks',
  roadmapGanttUnlocksNone: 'No downstream tasks in this dependency projection.',
  roadmapGanttUnlocksOne: 'Unlocks 1 downstream task.',
  roadmapGanttUnlocksMany: 'Unlocks {count} downstream tasks.',
  roadmapGanttTooltipDateRangeSep: '–',
  roadmapGanttChainHighlightToggleHint:
    'Dim tasks outside the selected task dependency chain (upstream + downstream).',
  roadmapGanttChainHighlightLabel: 'Highlight dependency chain',
  roadmapGanttSearchAriaLabel: 'Filter tasks by title',
  roadmapGanttSearchPlaceholder: 'Search tasks',
  roadmapGanttConfidenceTooltipPrefix: 'Confidence',
  roadmapGanttWeekendLegendLabel: 'Weekend',
  roadmapGanttSlackToggleLabel: 'Show slack / float',
  roadmapGanttSlackTooltipPrefix: 'Total float',
  roadmapGanttScheduleProgressToggleLabel: 'Show schedule progress',
  roadmapGanttScheduleElapsedTooltipPrefix: 'Schedule elapsed',
  roadmapGanttScheduleElapsedHint: 'Time-based along the plan window, not task completion %.',
  roadmapGanttTimelinePanelTitle: 'Roadmap timeline',
  roadmapGanttTimelinePanelHint: 'Multi-lane schedule with dependency context and keyboard control.',
  /** Shown under the timeline panel hint until a baseline is captured locally */
  roadmapGanttBaselinePanelOnboarding:
    'To compare drift later: open More options → Set baseline — a grey stripe on each bar shows overlap with that saved snapshot.',
  roadmapGanttMainPanelsTablistAriaLabel: 'Roadmap schedule panels',
  roadmapGanttMainTabTimelineLabel: 'Timeline',
  roadmapGanttMainTabDependenciesLabel: 'Dependencies',
  roadmapGanttDependenciesPanelTitle: 'Dependencies',
  roadmapGanttDepsGraphTabLabel: 'Graph',
  roadmapGanttDepsTableTabLabel: 'Table',
  roadmapGanttDepsViewTablistAriaLabel: 'Dependency visualization',
  roadmapGanttDepsModeGraphHint: 'Graph mode: investigate flow and bottlenecks',
  roadmapGanttDepsModeTableHint: 'Table mode: audit exact dependency pairs',
  roadmapGanttDepsMissingLinksHint: 'Missing links in the dependency matrix?',
  roadmapGanttDepsBuildStrategyLinkCta: 'Build strategy to populate this dependency map',
  roadmapGanttTimelineKeyboardShortcutsHint:
    'Arrow keys move focus across tasks; Enter opens details; M opens a lane picker to narrow the sidebar, or right-click a task bar for the same menu (schedule changes are not persisted from the client). T or D Timeline or Dependencies; G or B dependency Graph or Table; A expands advanced lane filters in the toolbar; R reset.',
  roadmapGanttTimelineGridAriaLabel: 'Roadmap timeline keyboard grid',
  /** aria-label for dependency graph SVG (dependencies tab). */
  roadmapGanttDependencyGraphSvgAriaLabel: 'Roadmap dependency arrow map',
  roadmapGanttOverviewMapAriaLabel: 'Roadmap overview map; drag to scroll the timeline',
  /** Linked from overview strip via aria-describedby (screen readers). */
  roadmapGanttOverviewMapLongDescription:
    'Press Home or End to jump to the start or end of the scrollable timeline. Arrow Left and Right move the visible window. Page Up and Page Down scroll by a larger step.',
  roadmapGanttOverviewKeyboardHint:
    'When this overview strip is focused: Arrow Left and Right scroll; Page Up and Page Down scroll farther; Home and End jump to the ends.',
  /** Mouse / pointer users — complements grab cursor on the overview strip */
  roadmapGanttOverviewPointerHint: 'Drag the strip to reposition the visible timeline range.',
  /** Shown on the timeline panel when many tasks are visible (heavy render path). */
  roadmapGanttHeavyTaskLoadTimelineNotice:
    'Large plan: showing {count} visible tasks (heavy load from {threshold}+). Narrow with search or filters if scrolling feels slow.',
  /** Shown on the dependency graph when arrow geometry is skipped for performance. */
  roadmapGanttHeavyTaskLoadGraphNotice:
    'Dependency arrows are paused: {count} visible tasks (heavy load from {threshold}+). Use the Table tab or narrow filters to restore the arrow map.',
  /** Announced when moving between main Timeline / Dependencies tabs from the tab list (keyboard). */
  roadmapGanttMainTabPanelAnnouncementTimeline: 'Timeline panel',
  roadmapGanttMainTabPanelAnnouncementDependencies: 'Dependencies panel',
  roadmapGanttOverviewEmptyFilteredLabel: 'No tasks in current filters',
  roadmapGanttEmptyFilteredActiveReasonPrefix: 'Current combination:',
  roadmapGanttResetViewCta: 'Reset view',
  roadmapGanttBlockedOnlyLabel: 'Blocked only',
  roadmapGanttPresetBlocked30Label: 'Preset: Blocked 30d',
  roadmapGanttPresetExecutionLabel: 'Preset: Execution',
  roadmapGanttDepsTableHeading: 'Dependency table',
  roadmapGanttDepsVirtualTableAria: 'Dependency pairs virtual list',
  roadmapGanttDepsColFrom: 'From',
  roadmapGanttDepsColTo: 'To',
  roadmapGanttDepsColType: 'Type',
  roadmapGanttDepsTableEmptyFilteredCta: 'No dependencies match current filters. Clear filters.',
  roadmapGanttDepsTableEmptyPlain: 'No dependencies available yet.',
  roadmapGanttFilterToLaneCta: 'Focus this lane on the roadmap',
  roadmapGanttScaleAriaLabel: 'Timeline scale',
  roadmapGanttHorizonAriaLabel: 'Day horizon',
  roadmapGanttBaselineStoredFormatResetNotice:
    'The saved baseline in this browser used an older format and was cleared. Set baseline again to compare.',
  roadmapGanttKeyboardFocusAnnouncement: 'Focused task {title}. Lane {lane}.',
  roadmapGanttKeyboardTaskOpenedAnnouncement: 'Task details opened for {title}. Lane {lane}.',
  roadmapGanttLaneMoveMenuTrigger: 'Focus lane…',
  roadmapGanttLaneMoveMenuLabel: 'Focus timeline on lane',
  /** Announced when opening the lane picker from the keyboard (M). */
  roadmapGanttLaneMoveMenuOpenedAnnouncement: 'Lane picker opened. Choose a lane to filter the sidebar, or press Escape to close.',
  roadmapGanttKeyboardLaneFilterAnnouncement: 'Lane filter: {lane}.',
  roadmapGanttKeyboardNavigationBoundaryAnnouncement:
    'No further task in that direction — try another lane filter or widen the visible range.',
  /** Legend caption for baseline comparison stripe shown on timeline bars after Set baseline */
  roadmapGanttBaselineStripeLegendCaption: 'Grey stripe matches the saved baseline on that portion of each bar.',
  roadmapGanttToolbarPrimarySectionTitle: 'Roadmap essentials',
  /** Announced once for the compact first toolbar row (view + Today + search). */
  roadmapGanttToolbarPrimaryRowScreenReaderTitle: 'View density and time scale',
  /** Shown inside More options — clarifies horizon / analysis vs primary row */
  roadmapGanttToolbarMoreHintSecondary:
    'Day window chips, baseline legend, dependency analysis and exports stay here so the timeline stays readable.',
  /** Baseline chip group heading inside More popover */
  roadmapGanttBaselineMoreSectionTitle: 'Baseline snapshot',
  roadmapGanttToolbarMoreViewTitle: 'Zoom and layout',
  /** Day-scale horizon chips (30 / 60 / 90) — lives in More options by default */
  roadmapGanttToolbarMoreHorizonTitle: 'Day window',
  roadmapGanttToolbarMoreHorizonMonthScaleNote: 'Month scale uses the full plan horizon; switch to Days to pick a 30 / 60 / 90 window.',
  roadmapGanttDensityLabel: 'Density',
  roadmapGanttDensityCompact: 'Compact',
  roadmapGanttDensityComfortable: 'Comfortable',
  roadmapGanttScaleDaysToggle: 'Days',
  roadmapGanttScaleMonthsToggle: 'Months',
  roadmapGanttHorizonDayChipSuffix: 'd',
  roadmapGanttToolbarMoreExpand: 'More options',
  roadmapGanttToolbarMoreCollapse: 'Close more options',
  roadmapGanttToolbarLegendSummary: 'Counts, weekends, and dependency colors',
  roadmapGanttToolbarMoreHint:
    'Navigate, analysis toggles, presets, exports, baseline capture, lane filters and dependency options. Density and time scale stay on the primary row. Shared URLs can include ?more=1 so this panel opens for others.',
  /** Minimal strip when timeline has tasks but baseline not captured yet */
  roadmapGanttBaselinePrimaryStripHint: 'No baseline yet — open More options to capture one for the grey comparison stripe.',
  roadmapGanttToolbarSearchSectionTitle: 'Search',
  roadmapGanttToolbarMoreNavigateTitle: 'Navigate timeline',
  roadmapGanttHorizonDayButtonTitleTemplate: 'Show approximately {days} days',
  roadmapGanttJumpTodayTitle: 'Jump timeline to today',
  roadmapGanttJumpTodayLabel: 'Today',
  roadmapGanttPrevRangeTitle: 'Scroll to previous date range',
  roadmapGanttPrevRangeAriaLabel: 'Previous range',
  roadmapGanttPrevRangeLabel: 'Prev',
  roadmapGanttNextRangeTitle: 'Scroll to next date range',
  roadmapGanttNextRangeAriaLabel: 'Next range',
  roadmapGanttNextRangeLabel: 'Next',
  roadmapGanttToolbarMoreAnalysisTitle: 'Analysis',
  roadmapGanttToolbarMoreFiltersTitle: 'Filters',
  roadmapGanttToolbarMoreActionsTitle: 'Actions',
  roadmapGanttDependencyTypeLabel: 'Dependency type',
  roadmapGanttDependencyTypeAll: 'All dependency types',
  roadmapGanttAdvancedLabel: 'Advanced',
  roadmapGanttToolbarResetHint: 'Reset clears filters, panel, and selected task.',
  roadmapGanttOwnerFilterLabel: 'Owner',
  roadmapGanttOwnerAll: 'All owners',
  roadmapGanttStatusFilterLabel: 'Status',
  roadmapGanttStatusAll: 'All statuses',
  roadmapGanttStatusPlanned: 'Planned',
  roadmapGanttStatusInProgress: 'In progress',
  roadmapGanttStatusDone: 'Done',
  roadmapGanttLaneFilterLabel: 'Lane',
  roadmapGanttLaneAll: 'All lanes',
  roadmapGanttDependencyViewLabel: 'Dependency view',
  roadmapGanttDependencyViewAll: 'All',
  roadmapGanttDependencyViewSelected: 'Selected task only',
  roadmapGanttDependencyViewHideWeak: 'Hide weak',
  roadmapGanttFilteredViewBadge: 'Filtered view',
  roadmapGanttClearFilterChipTitleTemplate: 'Clear {label}',
  roadmapGanttClearAllFilters: 'Clear all filters',
  roadmapGanttFilterLogicPrefix: 'Current filter logic: ',
  roadmapGanttFilterLogicFallback: 'active filters',
  roadmapGanttDependencyKindHelpAriaTemplate: '{kind} definition',
  roadmapRestoreSessionNoticeLead: 'View restored from your previous session.',
  roadmapRestoreSessionUseDefault: 'Use default view',
  roadmapRestoreSessionDismiss: 'Dismiss',
  roadmapEmptyNoTasksBody: 'No tasks available for this roadmap yet.',
  planRoadmapEmptyTasksTitle: 'Roadmap has no tasks yet',
  planRoadmapEmptyTasksHint: 'Add initiatives and build the execution pack in Strategy Lab — this schedule fills in automatically after the pack is saved.',
  planRoadmapEmptyTasksClientHint: 'Your consultant builds the execution pack in Strategy Lab. This view updates when tasks are available.',
  planRoadmapMapperEmptyTasksTitle: 'Roadmap schedule could not be built from timeline data',
  planRoadmapMapperEmptyTasksHint:
    'The API returned lanes with work items but the Gantt mapped zero tasks—a version skew or malformed row. Compare the Timeline view and retry after refresh; if this persists, report it.',
  planRoadmapMapperEmptyTasksClientHint:
    'Work items appear on other plan views but the schedule view could not interpret them yet. Ask your consultant to refresh or regenerate the timeline.',
  /** CTA when Roadmap has no tasks — links to default Plan workbench tab (Board when rollout is ga). */
  planRoadmapOpenPrimaryPlanCta: 'Open Plan',
  planTimelineEmptyLaneItemsTitle: 'This timeline has no work items yet',
  planTimelineEmptyLaneItemsHint:
    'Add initiatives and build the execution pack in Strategy Lab — lanes and seasons populate after the pack is saved.',
  planTimelineEmptyLaneItemsClientHint:
    'Your consultant builds the execution pack in Strategy Lab. This view updates when work items are published.',
  roadmapEmptyFilteredBodyPrefix: 'No tasks match current filters.',
  roadmapEmptyFilteredBodySuffix: 'Clear or relax filters to see work again.',
  roadmapDepsPanelIntro: 'Graph investigates flow; table audits exact pairs.',
  roadmapGanttToolbarMetricsLanesTemplate: 'Lanes {count}',
  roadmapGanttToolbarMetricsTasksTemplate: 'Tasks {count}',
  roadmapGanttToolbarMetricsDependenciesTemplate: 'Dependencies {count}',
  roadmapGanttTimelineHeaderCountsTemplate: 'Lanes {lanes} · Tasks {tasks}',
  roadmapGanttBaselineGhostLegend: 'Grey overlay: baseline window saved in this browser.',
  /** Announced on the task bar for screen readers (complements toolbar legend). */
  roadmapGanttBaselineGhostBarAria:
    'Baseline comparison: grey segment shows the portion of this task that overlapped with the saved baseline.',
  roadmapGanttBaselineBeforeSetHint:
    'Set baseline once to compare task bars later—the shaded stripe marks saved timing versus live projections.',
  roadmapGanttBaselineSetCta: 'Set baseline',
  roadmapGanttBaselineClearCta: 'Clear baseline',
  roadmapGanttBaselineTakenAtPrefix: 'Baseline saved',
  roadmapGanttBaselineTooltipCapturedLine: 'Captured {datetime} (this browser)',
  roadmapGanttBaselineLocalNotice: 'Baseline is stored only in this browser.',
  roadmapGanttBaselineDeltaStartLabel: 'Start delta vs baseline',
  roadmapGanttBaselineDeltaEndLabel: 'End delta vs baseline',
  roadmapGanttIcalExportCta: 'Download iCal (.ics)',
  roadmapGanttIcalExportBusy: 'Building calendar…',
  roadmapGanttIcalExportError: 'Could not build calendar file.',
} as const;

/** Portal Gantt drawer — downstream task count (keep wording in copy keys above). */
export function formatRoadmapGanttUnlocksCopy(count: number): string {
  if (count <= 0) return ORCHESTRATION_UI_COPY.roadmapGanttUnlocksNone;
  if (count === 1) return ORCHESTRATION_UI_COPY.roadmapGanttUnlocksOne;
  return ORCHESTRATION_UI_COPY.roadmapGanttUnlocksMany.replace('{count}', String(count));
}

/** Client-facing manifest state line on the portal timeline (no internal enum names). */
export const TIMELINE_MANIFEST_STATE_CLIENT: Record<OrchestrationManifestState, string> = {
  draft: 'Roadmap draft — scope may still change.',
  confirmed: 'Roadmap confirmed for this version.',
  stale: 'A newer roadmap draft exists — your consultant should refresh the saved plan.',
};

export function formatManifestStateForClient(state: OrchestrationManifestState | string): string {
  if (state in TIMELINE_MANIFEST_STATE_CLIENT) {
    return TIMELINE_MANIFEST_STATE_CLIENT[state as OrchestrationManifestState];
  }
  return ORCHESTRATION_UI_COPY.timelineManifestStateUnknown;
}

/** Consultant-only: single line for support tickets. */
export function formatTimelineApiStatusSupportLine(status: OrchestrationTimelineStatus): string {
  return `${ORCHESTRATION_UI_COPY.timelineDiagnosticReasonLabel}: ${status}`;
}

/** Timeline banner when manifest carries `plan_horizon` (keep copy out of TSX). */
export function formatTimelineCalendarPlanWindowLine(startIso: string, endIso: string): string {
  return `Calendar plan window: ${startIso} through ${endIso}. Near, mid, and later buckets follow this horizon.`;
}

/** Portal client — plainer wording for plan dates (keep copy out of TSX). */
export function formatTimelineCalendarPlanWindowLineClient(startIso: string, endIso: string): string {
  return `Dates on this plan: ${startIso} through ${endIso}. Near, mid, and later groups follow this range.`;
}

/**
 * IA: timeline-first vs Strategy Lab (ADR Phase 4). Single narrative SSOT for portal, Lab, cockpit.
 */
export const ORCHESTRATION_IA_COPY = {
  /** One line under Strategy / Plan chrome — Strategy Lab defines contract; Plan runs delivery surfaces. */
  strategyVsPlanMicroHint:
    'Strategy Lab defines context, manifest, and pack rebuilds. Plan runs delivery — Board, Roadmap schedule, or Table.',
  /** Long-form IA note (portal timeline, cockpit); Strategy Lab avoids repeating this on-page. */
  timelineVsLabRole:
    'Timeline is the primary view for sequencing, critical path, and cross-lane sync. Strategy Lab is for manifest snapshots, rebuilding the pack (vN+1), version diffs, coverage offers, and deep node detail.',
  /** AppShell subtitle on portal timeline when plan-workspace-primary UX is enabled. */
  timelinePageSubtitleWhenPrimary:
    'Sequencing and seasonal buckets live here. Strategy Lab in the toolbar covers manifest snapshots, new pack versions, and node detail.',
  /** Footnote under primary CTAs on client cockpit. */
  clientCockpitTimelineFootnote:
    'Sequencing and seasonal buckets live on the execution timeline; Strategy Lab remains the place for manifest and pack tooling.',
  /** Strategy Lab AppShell — single canonical line (duplicated Timeline vs Lab copy removed from the page body). */
  strategyLabAppShellSubtitle:
    'Define context, configure the manifest, and build the execution pack — then continue in Plan (Board, Roadmap, or Timeline).',
  /** Secondary line on client navigation cards (timeline). */
  clientNavTimelineCardSubtitle: 'Primary sequencing — seasonal buckets, lanes, and dependencies.',
  /** Secondary line on client navigation cards (Lab). */
  clientNavLabCardSubtitle: 'Manifest snapshots, pack tooling, and node-level detail.',
} as const;

export const ORCHESTRATION_LANE_LABELS = {
  product_change: 'Product / change',
  tech_delivery: 'Tech and delivery',
  marketing_narrative: 'Marketing and narrative',
  gtm_sales: 'GTM and revenue',
  seo: 'SEO',
  research: 'Research and validation',
  processes_automation: 'Processes and automation',
  risk_compliance: 'Risk and compliance',
} as const;

export const ORCHESTRATION_LANE_PROMISES: Record<OrchestrationLaneId, string> = {
  product_change: 'Clarify what to ship and when value appears.',
  tech_delivery: 'Reduce delivery risk with implementation sequencing.',
  marketing_narrative: 'Align positioning and messaging with execution.',
  gtm_sales:
    'RevOps and GTM: sequence pipeline, offers, and sales enablement with clear dates. Assign owners in your tracker; sprint CSV includes a DRI column when the pack provides owner hints.',
  seo: 'Build compounding organic acquisition foundations.',
  research: 'Run discovery and evidence-building before you scale build or spend.',
  processes_automation: 'Remove operational drag with repeatable systems.',
  risk_compliance: 'Protect growth with explicit controls and safeguards.',
};

export const ORCHESTRATION_PRIORITY_REASON_CODES: Record<string, string> = {
  near_term: 'Highest short-term leverage',
  critical_path: 'Unblocks the critical path',
  time_to_value: 'Fast path to measurable value',
};

export type OrchestrationLaneId = keyof typeof ORCHESTRATION_LANE_LABELS;

export const ORCHESTRATION_SCENARIO_LABELS: Record<OrchestrationChangeScenario, string> = {
  integrate_existing: 'Integrate existing stack',
  build_new: 'Build new',
  hybrid: 'Hybrid',
};

export const ORCHESTRATION_SEASON_LABELS: Record<OrchestrationSeasonPreset, string> = {
  rolling_30d: 'Rolling 30 days',
  rolling_90d: 'Rolling 90 days',
  rolling_180d: 'Rolling 180 days',
};

/**
 * Seasonal bucket headings on the timeline, keyed by manifest `season_preset`.
 * When preset is unknown/null, UI falls back to generic `bucketNear` / `bucketMid` / `bucketFar`.
 */
export const ORCHESTRATION_SEASON_BUCKET_LABELS_BY_PRESET: Record<
  OrchestrationSeasonPreset,
  { near: string; mid: string; far: string }
> = {
  rolling_30d: {
    near: 'First ~half of the 30-day window',
    mid: 'Second ~third',
    far: 'Final stretch',
  },
  rolling_90d: {
    near: 'Roughly first month',
    mid: 'Second month',
    far: 'Third month',
  },
  rolling_180d: {
    near: 'First ~45 days',
    mid: 'Mid horizon',
    far: 'Later tranche (toward 180 days)',
  },
};

export const ORCHESTRATION_PREVIEW_COMPRESSION_LABELS: Record<OrchestrationPreviewCompressionHint, string> = {
  none: 'None',
  mild: 'Mild',
  moderate: 'Moderate',
  strong: 'Strong',
};

export const ORCHESTRATION_PREVIEW_DENSITY_LABELS: Record<OrchestrationPreviewLaneDensityBand, string> = {
  sparse: 'Sparse',
  standard: 'Standard',
  dense: 'Dense',
};
