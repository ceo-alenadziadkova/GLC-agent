import { SeoVisibilityLayerAgent } from '../../agents/sub/seo/visibility-layer.js';
import { DIRECTOR_DEEP_DIVE_FALLBACK_ACTION_SCORES, SUB_AGENT_TOKEN_BUDGET_BY_DEPTH } from '../../config/director-orchestration-policy.js';
import { SeoVisibilityLayerOutputSchema } from '../../schemas/sub-agents/seo/visibility-layer.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * SEO deep-dive: deterministic visibility wave (MVP stub). LLM stack may replace internals later.
 */
export async function runSeoDirectorDeepDiveOrchestrator(input: {
  auditId?: string;
  domainKey: string;
  goals: string[];
  constraints: string[];
}): Promise<DirectorWaveBundle> {
  const runtime = new SeoVisibilityLayerAgent(input.auditId ?? 'deep-dive');
  let parsed: unknown;
  try {
    parsed = await runtime.runSubAgent({
      context: [`Domain: ${input.domainKey}`, `Goals: ${input.goals.join('; ')}`, `Constraints: ${input.constraints.join('; ')}`].join('\n'),
      mode: 'standard',
      maxTokens: SUB_AGENT_TOKEN_BUDGET_BY_DEPTH.standard,
    });
  } catch (error) {
    logger.warn('director_seo_orchestrator.fallback_deterministic', {
      error: error instanceof Error ? error.message : String(error),
      domain_key: input.domainKey,
    });
    parsed = SeoVisibilityLayerOutputSchema.parse({
      visibility_summary: `Deterministic SEO visibility pass for ${input.domainKey}.`,
      growth_surfaces: ['organic landing pages', 'technical SEO indexability'],
      content_risks: input.constraints.slice(0, 2).length > 0 ? input.constraints.slice(0, 2) : ['content quality unknowns'],
      analysis_mode: 'deterministic_fallback',
    });
  }
  const output = SeoVisibilityLayerOutputSchema.parse(parsed);
  return {
    zones: [input.domainKey, 'seo_digital'],
    bottlenecks: output.content_risks.slice(0, 3),
    risks: output.content_risks.slice(0, 3),
    actions: [
      {
        id: `sub_agent:seo.visibility_layer:${input.domainKey}`,
        title: `SEO visibility — ${output.visibility_summary.slice(0, 90)}`,
        description: output.growth_surfaces.join(' | '),
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
