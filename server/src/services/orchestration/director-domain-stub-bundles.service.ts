import { DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES } from '../../config/director-orchestration-policy.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import type { DirectorDeepDiveHandlerKind } from '../../config/director-domain-deep-dive-dispatch.js';

const LABEL: Record<Exclude<DirectorDeepDiveHandlerKind, 'cmo' | 'single_fallback'>, string> = {
  cdo_stub: 'CDO (delivery & data)',
  cao_stub: 'CAO (automation & ops)',
  cso_stub: 'CSO (security & risk)',
};

/**
 * Placeholder deep-dive bundle for non-CMO director lanes until per-domain sub-agent orchestrators
 * (router + policy + LLM) are fully wired. Uses the same DTO as CMO `deep` slice.
 */
export function buildDirectorDomainStubBundle(
  kind: 'cdo_stub' | 'cao_stub' | 'cso_stub',
  payload: { domainKey: string; goals: string[]; constraints: string[] },
): DirectorWaveBundle {
  const label = LABEL[kind];
  const s = DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES;
  return {
    actions: [
      {
        id: `domain_stub:${payload.domainKey}:primary`,
        title: `Deep-dive — ${label}`,
        description: payload.goals.join(' | ') || `Focused pass for ${payload.domainKey}`,
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [],
        evidence: {
          observed: payload.goals.slice(0, 2),
          assumed: payload.constraints.slice(0, 2),
        },
      },
      {
        id: `domain_stub:${payload.domainKey}:next_step`,
        title: 'Next validation step',
        description:
          'Confirm metrics, owners, and sequencing with your team; this stub will be replaced by domain sub-agents.',
        impact: s.impact,
        effort: s.effort,
        risk: s.risk,
        urgency: s.urgency,
        confidence: s.confidence,
        dependencies: [`domain_stub:${payload.domainKey}:primary`],
        evidence: {
          observed: [],
          assumed: ['Stub bundle — no LLM sub-agent run for this domain yet'],
        },
      },
    ],
    bottlenecks: [],
    risks: payload.constraints.slice(0, 3),
    zones: [payload.domainKey],
  };
}
