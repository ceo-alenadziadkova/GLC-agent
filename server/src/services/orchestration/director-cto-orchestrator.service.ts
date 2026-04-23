import { CtoReadinessAgent } from '../../agents/sub/cto/readiness.js';
import { DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES, SUB_AGENT_TOKEN_BUDGET_BY_DEPTH } from '../../config/director-orchestration-policy.js';
import { CtoReadinessOutputSchema } from '../../schemas/sub-agents/cto/readiness.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CTO deep-dive: deterministic readiness wave (MVP stub). LLM stack may replace internals later.
 */
export async function runCtoDirectorDeepDiveOrchestrator(input: {
  auditId?: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
}): Promise<DirectorWaveBundle> {
  const runtime = new CtoReadinessAgent(input.auditId ?? 'deep-dive');
  let parsed: unknown;
  try {
    parsed = await runtime.runSubAgent({
      context: [`Domain: ${input.domainKey}`, `Goals: ${input.goals.join('; ')}`, `Constraints: ${input.constraints.join('; ')}`].join('\n'),
      mode: 'standard',
      maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH.standard,
    });
  } catch (error) {
    logger.warn('director_cto_orchestrator.fallback_deterministic', {
      error: error instanceof Error ? error.message : String(error),
      domain_key: input.domainKey,
    });
    parsed = CtoReadinessOutputSchema.parse({
      readiness_summary: `Deterministic CTO readiness pass for ${input.domainKey}.`,
      architecture_focus: ['service reliability baseline', 'deployment safety checks'],
      delivery_risks: input.constraints.slice(0, 2).length > 0 ? input.constraints.slice(0, 2) : ['platform unknowns'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  const output = CtoReadinessOutputSchema.parse(parsed);
  return {
    zones: [input.domainKey, 'tech_infrastructure'],
    bottlenecks: output.delivery_risks.slice(0, 3),
    risks: output.delivery_risks.slice(0, 3),
    actions: [
      {
        id: `sub_agent:cto.readiness:${input.domainKey}`,
        title: `CTO readiness — ${output.readiness_summary.slice(0, 90)}`,
        description: output.architecture_focus.join(' | '),
        impact: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.impact,
        effort: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.effort,
        risk: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.risk,
        urgency: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.urgency,
        confidence: DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES.confidence,
        dependencies: [],
      },
    ],
  };
}
