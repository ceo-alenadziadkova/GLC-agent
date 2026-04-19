/**
 * Strategy Lab — unified roadmap / orchestration UI copy (English).
 */

import type { OrchestrationChangeScenario, OrchestrationSeasonPreset } from './orchestration-roadmap-manifest';

export const ORCHESTRATION_UI_COPY = {
  sectionTitle: 'Roadmap input',
  sectionHint:
    'Confirm how you want to execute changes and the planning window. Coverage must match this audit’s execution plan.',
  coverageLabel: 'Coverage (from audit)',
  scenarioLabel: 'Change scenario',
  seasonLabel: 'Planning window',
  previewTitle: 'Preview',
  previewDomains: 'Domains in scope',
  previewScenario: 'Scenario',
  previewSeason: 'Window',
  confirmSaveManifest: 'Save manifest snapshot',
  buildPack: 'Build orchestration pack',
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
  versionLabel: 'Pack version',
  noPackYet: 'No orchestration pack yet. Save a manifest, then build the pack.',
  clientHidden: 'Roadmap manifest is available to consultants on this audit.',
  synthesisSectionTitle: 'Orchestrator synthesis',
  synthesisSectionHint:
    'Cross-domain trade-offs from the optional synthesis pass (when enabled on the server). Deterministic graph and lanes are unchanged.',
  synthesisResolutionApplied: 'Applied',
  synthesisResolutionPending: 'Pending',
} as const;

export const ORCHESTRATION_LANE_LABELS = {
  product_change: 'Product / change',
  tech_delivery: 'Tech and delivery',
  marketing_narrative: 'Marketing and narrative',
  seo: 'SEO',
  processes_automation: 'Processes and automation',
  risk_compliance: 'Risk and compliance',
} as const;

export const ORCHESTRATION_SCENARIO_LABELS: Record<OrchestrationChangeScenario, string> = {
  integrate_existing: 'Integrate existing stack',
  build_new: 'Build new',
  hybrid: 'Hybrid',
};

export const ORCHESTRATION_SEASON_LABELS: Record<OrchestrationSeasonPreset, string> = {
  q1_90d: 'Q1 (90 days)',
  q2_90d: 'Q2 (90 days)',
  q3_90d: 'Q3 (90 days)',
  q4_90d: 'Q4 (90 days)',
  rolling_90d: 'Rolling 90 days',
  milestone_phased: 'Milestone phased',
};
