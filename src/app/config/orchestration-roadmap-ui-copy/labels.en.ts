import type {
  OrchestrationChangeScenario,
  OrchestrationPreviewCompressionHint,
  OrchestrationPreviewLaneDensityBand,
  OrchestrationSeasonPreset,
} from '../orchestration-roadmap-manifest';

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

export type OrchestrationLaneId = keyof typeof ORCHESTRATION_LANE_LABELS;

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
