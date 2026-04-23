export type CdoAccessLevel = 'zero_access' | 'partial_access' | 'deep_access';

export type CdoSubAgentDepth = 'min' | 'standard' | 'max' | 'deferred';

export type CdoMvpSubAgentId = 'cdo.funnel_architect' | 'cdo.friction' | 'cdo.experimentation';

/**
 * Access-aware depth matrix for CDO MVP sub-agents (Funnel / Friction / Experimentation).
 * Aligns with docs/instructions/CDO-INSTRUCTIONS.md §4 (zero / partial / deep access).
 */
export const DIRECTOR_CDO_ACCESS_AGENT_DEPTHS: Record<CdoAccessLevel, Record<CdoMvpSubAgentId, CdoSubAgentDepth>> = {
  zero_access: {
    'cdo.funnel_architect': 'standard',
    'cdo.friction': 'standard',
    'cdo.experimentation': 'min',
  },
  partial_access: {
    'cdo.funnel_architect': 'max',
    'cdo.friction': 'standard',
    'cdo.experimentation': 'standard',
  },
  deep_access: {
    'cdo.funnel_architect': 'max',
    'cdo.friction': 'max',
    'cdo.experimentation': 'max',
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

export function listCdoMvpAgentIds(): readonly CdoMvpSubAgentId[] {
  return ['cdo.funnel_architect', 'cdo.friction', 'cdo.experimentation'];
}
