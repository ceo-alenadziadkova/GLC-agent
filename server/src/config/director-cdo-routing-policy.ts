export type CdoAccessLevel = 'zero_access' | 'partial_access' | 'deep_access';

export type CdoSubAgentDepth = 'min' | 'standard' | 'max' | 'deferred';

export type CdoSubAgentId =
  | 'cdo.user_intent'
  | 'cdo.funnel_architect'
  | 'cdo.value_proposition'
  | 'cdo.friction'
  | 'cdo.trust_credibility'
  | 'cdo.behavioral_psychology'
  | 'cdo.ui_consistency'
  | 'cdo.copy_microcopy'
  | 'cdo.experimentation'
  | 'cdo.analytics_tracking'
  | 'cdo.benchmark_patterns';

/** Backward-compatibility alias kept for existing imports/tests. */
export type CdoMvpSubAgentId = CdoSubAgentId;

/**
 * Access-aware depth matrix for CDO MVP sub-agents (Funnel / Friction / Experimentation).
 * Aligns with docs/instructions/CDO-INSTRUCTIONS.md §4 (zero / partial / deep access).
 */
export const DIRECTOR_CDO_ACCESS_AGENT_DEPTHS: Record<CdoAccessLevel, Record<CdoSubAgentId, CdoSubAgentDepth>> = {
  zero_access: {
    'cdo.user_intent': 'max',
    'cdo.funnel_architect': 'max',
    'cdo.value_proposition': 'max',
    'cdo.friction': 'max',
    'cdo.trust_credibility': 'max',
    'cdo.behavioral_psychology': 'max',
    'cdo.ui_consistency': 'max',
    'cdo.copy_microcopy': 'max',
    'cdo.experimentation': 'min',
    'cdo.analytics_tracking': 'min',
    'cdo.benchmark_patterns': 'standard',
  },
  partial_access: {
    'cdo.user_intent': 'max',
    'cdo.funnel_architect': 'max',
    'cdo.value_proposition': 'max',
    'cdo.friction': 'standard',
    'cdo.trust_credibility': 'standard',
    'cdo.behavioral_psychology': 'standard',
    'cdo.ui_consistency': 'standard',
    'cdo.copy_microcopy': 'standard',
    'cdo.experimentation': 'standard',
    'cdo.analytics_tracking': 'standard',
    'cdo.benchmark_patterns': 'standard',
  },
  deep_access: {
    'cdo.user_intent': 'max',
    'cdo.funnel_architect': 'max',
    'cdo.value_proposition': 'max',
    'cdo.friction': 'max',
    'cdo.trust_credibility': 'max',
    'cdo.behavioral_psychology': 'max',
    'cdo.ui_consistency': 'max',
    'cdo.copy_microcopy': 'max',
    'cdo.experimentation': 'max',
    'cdo.analytics_tracking': 'max',
    'cdo.benchmark_patterns': 'max',
  },
};

export function routeCdoAccessLevel(input: { goals: string[]; constraints: string[] }): CdoAccessLevel {
  const text = [...input.goals, ...input.constraints].join(' ').toLowerCase();
  if (/(analytics|amplitude|mixpanel|ga4|hotjar|fullstory|heap|datadog)/.test(text)) {
    return 'deep_access';
  }
  if (/(tracking|events|dashboard|metric|funnel|conversion rate)/.test(text)) {
    return 'partial_access';
  }
  return 'zero_access';
}

export function listCdoMvpAgentIds(): readonly CdoSubAgentId[] {
  return [
    'cdo.user_intent',
    'cdo.funnel_architect',
    'cdo.value_proposition',
    'cdo.friction',
    'cdo.trust_credibility',
    'cdo.behavioral_psychology',
    'cdo.ui_consistency',
    'cdo.copy_microcopy',
    'cdo.experimentation',
    'cdo.analytics_tracking',
    'cdo.benchmark_patterns',
  ];
}
