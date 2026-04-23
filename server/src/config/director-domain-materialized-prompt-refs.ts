/**
 * SSOT: prompt file paths for deterministic CDO/CAO/CSO materialized deep-dive waves
 * (`director-domain-materialized-bundles.service.ts`). Matches CMO pattern: `server/prompts/sub-agents/<domain>/...md`.
 * When LLM sub-agents ship for these domains, loaders should use these paths (same as `prompt_ref` on CMO registry rows).
 */
export const CDO_MATERIALIZED_PROMPT_REFS = {
  funnel_architect: 'server/prompts/sub-agents/cdo/funnel-architect.md',
  friction: 'server/prompts/sub-agents/cdo/friction.md',
  experimentation: 'server/prompts/sub-agents/cdo/experimentation.md',
} as const;

export const CAO_MATERIALIZED_PROMPT_REFS = {
  process_map: 'server/prompts/sub-agents/cao/process-map.md',
  automation_candidates: 'server/prompts/sub-agents/cao/automation-candidates.md',
  throughput: 'server/prompts/sub-agents/cao/throughput.md',
} as const;

export const CSO_MATERIALIZED_PROMPT_REFS = {
  case_classifier: 'server/prompts/sub-agents/cso/case-classifier.md',
  threat_model: 'server/prompts/sub-agents/cso/threat-model.md',
  compliance_map: 'server/prompts/sub-agents/cso/compliance-map.md',
} as const;

export const CTO_MATERIALIZED_PROMPT_REFS = {
  readiness: 'server/prompts/sub-agents/cto/readiness.md',
} as const;

export const SEO_MATERIALIZED_PROMPT_REFS = {
  visibility: 'server/prompts/sub-agents/seo/visibility-layer.md',
} as const;

export const ALL_DOMAIN_MATERIALIZED_PROMPT_REFS: readonly string[] = [
  ...Object.values(CDO_MATERIALIZED_PROMPT_REFS),
  ...Object.values(CAO_MATERIALIZED_PROMPT_REFS),
  ...Object.values(CSO_MATERIALIZED_PROMPT_REFS),
  ...Object.values(CTO_MATERIALIZED_PROMPT_REFS),
  ...Object.values(SEO_MATERIALIZED_PROMPT_REFS),
];
