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
  flowTitle: 'Roadmap flow',
  flowScope: 'Scope',
  flowPreview: 'Preview',
  flowConfirm: 'Confirm',
  flowVersion: 'Version',
  flowDone: 'Done',
  flowPending: 'Pending',
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
  previewCompression: 'Execution compression hint',
  previewDensity: 'Planning density',
  roadmapVersionLabel: 'Roadmap version',
  revisionDiffTitle: 'Last plan change',
  revisionHistoryTitle: 'Version history',
  revisionCompareLabel: 'Compare',
  snapshotHistoryTitle: 'Manifest snapshot history',
  snapshotHistoryLabel: 'Snapshot',
  snapshotHistoryEmpty: 'No saved snapshots yet',
  snapshotAutoSelected: 'Loaded latest manifest snapshot',
  snapshotVersionHint: 'Build roadmap from selected snapshot to preserve version traceability.',
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
  buildPack: 'Build orchestration pack',
  buildPackNeedsManifestSync: 'Save manifest changes before rebuilding roadmap',
  manifestSaved: 'Manifest snapshot saved',
  packBuilt: 'Orchestration pack saved',
  manifestSaveFailed: 'Could not save manifest',
  /** Strategy Lab — POST orchestration pack failed */
  packBuildFailed: 'Could not build orchestration pack',
  /** Timeline page — GET /timeline failed (network, 4xx, 5xx); not the same as a missing pack */
  timelineLoadFailed: 'Could not load execution timeline',
  timelineTitle: 'Execution timeline',
  timelineHint: 'Critical path grouped into planning buckets; lanes show parallel tracks.',
  timelineStateMissingPack:
    'No execution pack is saved yet, so the seasonal timeline is empty. Your consultant confirms scope in Strategy Lab, saves a manifest snapshot, then builds the pack — after that, this view fills in automatically.',
  /** Prominent empty-state title when pack is missing or manifest is stale */
  timelineEmptyCalloutTitle: 'Timeline not populated yet',
  timelineEmptyCalloutClientHint:
    'Your consultant confirms the roadmap manifest in Strategy Lab and builds the execution pack. You can keep this page open — it updates automatically once the pack is saved.',
  timelineEmptyCtaOpenReport: 'Open full report',
  timelineEmptyCtaAuditOverview: 'Audit overview',
  timelineStateDegraded: 'Timeline is available with degraded input coverage.',
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
  /** Overview tab — compact plan metadata when the hero is not shown (non-ready timelines). */
  portalTimelinePlanSnapshotTitle: 'Plan snapshot',
  /** Plan map tab — no pack yet or timeline not ready. */
  timelinePlanMapUnavailableHint: 'The interactive dependency map appears when a saved execution plan is available for this audit.',
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
  topActionsTitle: 'Top actions',
  topActions7dLabel: 'Next 7 days',
  topActions30dLabel: 'Next 30 days',
  /** Portal timeline — saved Strategy Lab execution packs (optional server feature). */
  executionPacksSectionTitle: 'Execution detail packs',
  executionPacksSectionHint:
    'Deeper initiative breakdowns from Strategy Lab (extra AI pass). Use Detail pack on “Top actions” for a one-click request, or open Lab for multi-select and path options.',
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
  /** Portal timeline — sync markers (V7): short cross-lane narrative when blocking cross-lane deps exist. */
  timelineCrossLaneNarrativeTitle: 'Aligning lanes before you commit dates',
  timelineCrossLaneNarrativeBody:
    'Marketing, delivery, and operations often run on different clocks. The sync links below flag where one lane must wait on another—use them to line up owners and commitments.',
  executionPacksEmpty: 'No execution detail packs saved for this audit yet.',
  executionPacksLoadError: 'Execution pack history is unavailable (feature off or network error).',
  executionPacksRowInitiativesLabel: 'initiatives',
  executionPacksCtaLab: 'Open Strategy Lab',
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
  synthesisSectionTitle: 'Orchestrator synthesis',
  synthesisSectionHint:
    'Cross-domain trade-offs from the optional synthesis pass (when enabled on the server). Deterministic graph and lanes are unchanged.',
  synthesisResolutionApplied: 'Applied',
  synthesisResolutionPending: 'Pending',
  commercialOfferTitle: 'Coverage expansion offer',
  commercialCheckCta: 'Check coverage gaps',
  commercialChecking: 'Checking coverage gaps…',
  commercialAcceptCta: 'Accept',
  commercialConfirmAcceptPrompt: 'Apply coverage change and recompute roadmap version?',
  commercialRecalculatedPrefix: 'Recalculated lanes after adding',
  commercialWhyNowTitle: 'Why now (graph-aware)',
  commercialBeforeAfterTitle: 'Lanes before / after offer',
  commercialBeforeLabel: 'Current scope',
  commercialAfterLabel: 'If accepted',
  commercialAcceptedReviewTimeline:
    'Coverage update applied. Open the execution timeline to review seasons, lanes, and dependencies for the new roadmap version.',
  commercialAcceptedOpenTimeline: 'Open execution timeline',
  commercialAcceptedCompareHint: 'Use revision history below to compare this pack to the previous version.',
  governanceTitle: 'Plan governance',
  governanceDecisionHintLabel: 'Decision hint',
  governanceInputHeaderLabel: 'Input quality gate',
  governanceReasonHintTitle: 'What to fix before next run',
  governanceScoresLabel: 'Integrity / confidence / risk',
  governanceCriticalPathCoverageLabel: 'Critical path coverage',
  nodeBadgeBaseline: 'Baseline',
  nodeBadgeDeep: 'Deep',
  nodeBadgeDirector: 'Director',
  nodeBadgeStrategy: 'Strategy',
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
  /** Placeholder for empty season/lane/top lists */
  timelineEmptyListMarker: '—',
  timelineManifestStateLabel: 'Manifest state:',
  /** Shown next to manifest state when API returns `version.season_preset` */
  timelinePlanningWindowLabel: 'Planning window',
  timelineRoadmapVersionPrefix: 'Roadmap v',
  dataGapsMissingConfidenceLabel: 'Missing confidence:',
  dataGapsMissingRiskLabel: 'Missing risk:',
  dataGapsDanglingDependenciesLabel: 'Dangling dependencies:',
  /** Client label when manifest state is unknown to the UI mapping (legacy payloads). */
  timelineManifestStateUnknown: 'Roadmap status: see your consultant if this looks wrong.',
} as const;

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
  timelineVsLabRole:
    'Timeline is the primary view for sequencing, critical path, and cross-lane sync. Strategy Lab is for manifest snapshots, rebuilding the pack (vN+1), version diffs, coverage offers, and deep node detail.',
  /** AppShell subtitle on portal timeline when `orchestrationTimelinePrimaryUxEnabled` is on. */
  timelinePageSubtitleWhenPrimary:
    'Sequencing and seasonal buckets live here. Strategy Lab in the toolbar covers manifest snapshots, new pack versions, and node detail.',
  /** Footnote under primary CTAs on client cockpit. */
  clientCockpitTimelineFootnote:
    'Sequencing and seasonal buckets live on the execution timeline; Strategy Lab remains the place for manifest and pack tooling.',
  /** Strategy Lab AppShell / page subtitle. */
  strategyLabAppShellSubtitle:
    'Detail layer: manifest snapshots, pack versions, and node inspection. Sequencing stays on the execution timeline.',
  /** Secondary line on client navigation cards (timeline). */
  clientNavTimelineCardSubtitle: 'Primary sequencing — seasonal buckets, lanes, and dependencies.',
  /** Secondary line on client navigation cards (Lab). */
  clientNavLabCardSubtitle: 'Manifest snapshots, pack tooling, and node-level detail.',
} as const;

export const ORCHESTRATION_LANE_LABELS = {
  product_change: 'Product / change',
  tech_delivery: 'Tech and delivery',
  marketing_narrative: 'Marketing and narrative',
  seo: 'SEO',
  processes_automation: 'Processes and automation',
  risk_compliance: 'Risk and compliance',
} as const;

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
