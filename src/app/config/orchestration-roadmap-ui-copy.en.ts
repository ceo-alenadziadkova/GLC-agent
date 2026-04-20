/**
 * Strategy Lab — unified roadmap / orchestration UI copy (English).
 */

import type {
  OrchestrationChangeScenario,
  OrchestrationPreviewCompressionHint,
  OrchestrationPreviewLaneDensityBand,
  OrchestrationSeasonPreset,
} from './orchestration-roadmap-manifest';

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
  timelineStateDegraded: 'Timeline is available with degraded input coverage.',
  timelineStateStaleManifest: 'Timeline is stale relative to latest manifest snapshot.',
  timelineStateRestricted: 'This view is restricted to client-safe roadmap fields.',
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
  topActionsTitle: 'Top actions',
  topActions7dLabel: 'Next 7 days',
  topActions30dLabel: 'Next 30 days',
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
    'Strategy Lab now focuses on node-level detail. The shared timeline projection remains in the report roadmap section.',
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
  /** Placeholder for empty season/lane/top lists */
  timelineEmptyListMarker: '—',
  timelineManifestStateLabel: 'Manifest state:',
  /** Shown next to manifest state when API returns `version.season_preset` */
  timelinePlanningWindowLabel: 'Planning window',
  timelineRoadmapVersionPrefix: 'Roadmap v',
  dataGapsMissingConfidenceLabel: 'Missing confidence:',
  dataGapsMissingRiskLabel: 'Missing risk:',
  dataGapsDanglingDependenciesLabel: 'Dangling dependencies:',
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
