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
  packBuildFailed: 'Could not build pack',
  timelineTitle: 'Execution timeline',
  timelineHint: 'Critical path grouped into planning buckets; lanes show parallel tracks.',
  bucketNear: 'Near term',
  bucketMid: 'Mid term',
  bucketFar: 'Later',
  lanesTitle: 'Lanes',
  dependencyTitle: 'Key dependencies',
  dependencyHint: 'Cross-lane links are listed first; longer graphs are truncated for readability.',
  versionLabel: 'Pack version',
  openNodeInLab: 'Open in Lab',
  noPackYet: 'No orchestration pack yet. Save a manifest, then build the pack.',
  labDetailLayerHint:
    'Strategy Lab now focuses on node-level detail. The shared timeline projection remains in the report roadmap section.',
  clientHidden: 'Roadmap manifest is available to consultants on this audit.',
  clientTimelineReadOnlyHint:
    'The full seasonal timeline and lanes live in your report. Open it to see ordering, then return here for initiative detail.',
  clientOpenFullTimeline: 'Open timeline in report',
  synthesisSectionTitle: 'Orchestrator synthesis',
  synthesisSectionHint:
    'Cross-domain trade-offs from the optional synthesis pass (when enabled on the server). Deterministic graph and lanes are unchanged.',
  synthesisResolutionApplied: 'Applied',
  synthesisResolutionPending: 'Pending',
  commercialOfferTitle: 'Coverage expansion offer',
  commercialCheckCta: 'Check coverage gaps',
  commercialChecking: 'Checking coverage gaps…',
  commercialAcceptCta: 'Accept',
  commercialRecalculatedPrefix: 'Recalculated lanes after adding',
  governanceTitle: 'Plan governance',
  governanceDecisionHintLabel: 'Decision hint',
  governanceScoresLabel: 'Integrity / confidence / risk',
  governanceCriticalPathCoverageLabel: 'Critical path coverage',
  nodeBadgeBaseline: 'Baseline',
  nodeBadgeDeep: 'Deep',
  nodeBadgeDirector: 'Director',
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
