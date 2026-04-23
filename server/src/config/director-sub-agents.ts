import type { DomainKey } from '@glc/intake-core';

/**
 * Canonical registry of director sub-agents (CMO full stack + CDO/CAO/CSO MVP + CTO/SEO scaffolding).
 * Checklist for new ids: extend `DirectorSubAgentId` → row below → Zod schema → agent class → prompt file → Vitest + `director-sub-agents-consistency.test.ts`.
 * Product backlog for agents beyond MVP: `docs/adrs/ADR-ORCHESTRATION-AND-ROADMAP-ROLLOUT-PLAN.md` (Continuous work — G4).
 */

export type DirectorSubAgentId =
  | 'cmo.agent_1_market'
  | 'cmo.agent_2_awareness_ladder'
  | 'cmo.agent_3_positioning'
  | 'cmo.agent_4_voice'
  | 'cmo.agent_5_content_strategy'
  | 'cmo.agent_6_viral'
  | 'cmo.agent_7_storytelling'
  | 'cmo.agent_8_ready_posts'
  | 'cmo.agent_9_traffic'
  | 'cmo.agent_10_distribution'
  | 'cmo.agent_11_founder_brand'
  | 'cmo.agent_12_growth_loops'
  | 'cdo.funnel_architect'
  | 'cdo.friction'
  | 'cdo.experimentation'
  | 'cao.process_map'
  | 'cao.automation_candidates'
  | 'cao.throughput'
  | 'cso.case_classifier'
  | 'cso.threat_model'
  | 'cso.compliance_map'
  | 'cto.readiness_baseline'
  | 'cto.architecture_risk_model'
  | 'cto.reliability_runtime'
  | 'cto.observability_incident'
  | 'cto.delivery_release_safety'
  | 'cto.security_supply_chain'
  | 'cto.data_platform_resilience'
  | 'cto.roadmap_tradeoffs'
  | 'seo.visibility_baseline'
  | 'seo.technical_indexability'
  | 'seo.ia_internal_links'
  | 'seo.content_intent_coverage'
  | 'seo.serp_ctr_levers'
  | 'seo.authority_trust'
  | 'seo.local_international_readiness'
  | 'seo.measurement_experimentation';

/**
 * Controlled cross-domain dependency policy.
 * These edges are allowed for planning/critical-path visibility and remain opt-in.
 */
export const DIRECTOR_CROSS_DOMAIN_DEPENDENCY_ALLOWLIST: ReadonlyArray<{
  from: DirectorSubAgentId;
  to: DirectorSubAgentId;
}> = [
  {
    from: 'cdo.experimentation',
    to: 'cmo.agent_9_traffic',
  },
];

export const DIRECTOR_SUB_AGENTS: ReadonlyArray<{
  id: DirectorSubAgentId;
  director_domain: DomainKey;
  agent_number_in_instructions: number;
  title_copy_key: string;
  description_copy_key: string;
  output_schema_ref: string;
  prompt_ref: string;
  depends_on: DirectorSubAgentId[];
}> = [
  {
    id: 'cmo.agent_1_market',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 1,
    title_copy_key: 'subAgent.cmo.agent1.title',
    description_copy_key: 'subAgent.cmo.agent1.description',
    output_schema_ref: 'schemas/sub-agents/cmo/market',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-1-market.md',
    depends_on: [],
  },
  {
    id: 'cmo.agent_2_awareness_ladder',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 2,
    title_copy_key: 'subAgent.cmo.agent2.title',
    description_copy_key: 'subAgent.cmo.agent2.description',
    output_schema_ref: 'schemas/sub-agents/cmo/awareness-ladder',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-2-awareness-ladder.md',
    depends_on: [],
  },
  {
    id: 'cmo.agent_3_positioning',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 3,
    title_copy_key: 'subAgent.cmo.agent3.title',
    description_copy_key: 'subAgent.cmo.agent3.description',
    output_schema_ref: 'schemas/sub-agents/cmo/positioning',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-3-positioning.md',
    depends_on: ['cmo.agent_1_market', 'cmo.agent_2_awareness_ladder'],
  },
  {
    id: 'cmo.agent_4_voice',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 4,
    title_copy_key: 'subAgent.cmo.agent4.title',
    description_copy_key: 'subAgent.cmo.agent4.description',
    output_schema_ref: 'schemas/sub-agents/cmo/voice',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-4-voice.md',
    depends_on: ['cmo.agent_3_positioning'],
  },
  {
    id: 'cmo.agent_5_content_strategy',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 5,
    title_copy_key: 'subAgent.cmo.agent5.title',
    description_copy_key: 'subAgent.cmo.agent5.description',
    output_schema_ref: 'schemas/sub-agents/cmo/content-strategy',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-5-content-strategy.md',
    depends_on: ['cmo.agent_2_awareness_ladder', 'cmo.agent_3_positioning', 'cmo.agent_4_voice'],
  },
  {
    id: 'cmo.agent_6_viral',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 6,
    title_copy_key: 'subAgent.cmo.agent6.title',
    description_copy_key: 'subAgent.cmo.agent6.description',
    output_schema_ref: 'schemas/sub-agents/cmo/viral',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-6-viral.md',
    depends_on: ['cmo.agent_2_awareness_ladder', 'cmo.agent_3_positioning', 'cmo.agent_4_voice'],
  },
  {
    id: 'cmo.agent_7_storytelling',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 7,
    title_copy_key: 'subAgent.cmo.agent7.title',
    description_copy_key: 'subAgent.cmo.agent7.description',
    output_schema_ref: 'schemas/sub-agents/cmo/storytelling',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-7-storytelling.md',
    depends_on: ['cmo.agent_4_voice'],
  },
  {
    id: 'cmo.agent_8_ready_posts',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 8,
    title_copy_key: 'subAgent.cmo.agent8.title',
    description_copy_key: 'subAgent.cmo.agent8.description',
    output_schema_ref: 'schemas/sub-agents/cmo/ready-posts',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-8-ready-posts.md',
    depends_on: ['cmo.agent_3_positioning', 'cmo.agent_4_voice', 'cmo.agent_5_content_strategy'],
  },
  {
    id: 'cmo.agent_9_traffic',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 9,
    title_copy_key: 'subAgent.cmo.agent9.title',
    description_copy_key: 'subAgent.cmo.agent9.description',
    output_schema_ref: 'schemas/sub-agents/cmo/traffic',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-9-traffic.md',
    depends_on: ['cmo.agent_3_positioning', 'cmo.agent_5_content_strategy', 'cmo.agent_8_ready_posts'],
  },
  {
    id: 'cmo.agent_10_distribution',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 10,
    title_copy_key: 'subAgent.cmo.agent10.title',
    description_copy_key: 'subAgent.cmo.agent10.description',
    output_schema_ref: 'schemas/sub-agents/cmo/distribution',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-10-distribution.md',
    depends_on: ['cmo.agent_9_traffic'],
  },
  {
    id: 'cmo.agent_11_founder_brand',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 11,
    title_copy_key: 'subAgent.cmo.agent11.title',
    description_copy_key: 'subAgent.cmo.agent11.description',
    output_schema_ref: 'schemas/sub-agents/cmo/founder-brand',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-11-founder-brand.md',
    depends_on: [],
  },
  {
    id: 'cmo.agent_12_growth_loops',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 12,
    title_copy_key: 'subAgent.cmo.agent12.title',
    description_copy_key: 'subAgent.cmo.agent12.description',
    output_schema_ref: 'schemas/sub-agents/cmo/growth-loops',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-12-growth-loops.md',
    depends_on: ['cmo.agent_1_market', 'cmo.agent_3_positioning', 'cmo.agent_9_traffic', 'cmo.agent_10_distribution'],
  },
  {
    id: 'cdo.funnel_architect',
    director_domain: 'ux_conversion',
    agent_number_in_instructions: 2,
    title_copy_key: 'subAgent.cdo.funnel_architect.title',
    description_copy_key: 'subAgent.cdo.funnel_architect.description',
    output_schema_ref: 'schemas/sub-agents/cdo/funnel-architect',
    prompt_ref: 'server/prompts/sub-agents/cdo/funnel-architect.md',
    depends_on: [],
  },
  {
    id: 'cdo.friction',
    director_domain: 'ux_conversion',
    agent_number_in_instructions: 4,
    title_copy_key: 'subAgent.cdo.friction.title',
    description_copy_key: 'subAgent.cdo.friction.description',
    output_schema_ref: 'schemas/sub-agents/cdo/friction',
    prompt_ref: 'server/prompts/sub-agents/cdo/friction.md',
    depends_on: ['cdo.funnel_architect'],
  },
  {
    id: 'cdo.experimentation',
    director_domain: 'ux_conversion',
    agent_number_in_instructions: 9,
    title_copy_key: 'subAgent.cdo.experimentation.title',
    description_copy_key: 'subAgent.cdo.experimentation.description',
    output_schema_ref: 'schemas/sub-agents/cdo/experimentation',
    prompt_ref: 'server/prompts/sub-agents/cdo/experimentation.md',
    depends_on: ['cdo.friction', 'cmo.agent_9_traffic'],
  },
  {
    id: 'cao.process_map',
    director_domain: 'automation_processes',
    agent_number_in_instructions: 1,
    title_copy_key: 'subAgent.cao.process_map.title',
    description_copy_key: 'subAgent.cao.process_map.description',
    output_schema_ref: 'schemas/sub-agents/cao/process-map',
    prompt_ref: 'server/prompts/sub-agents/cao/process-map.md',
    depends_on: [],
  },
  {
    id: 'cao.automation_candidates',
    director_domain: 'automation_processes',
    agent_number_in_instructions: 2,
    title_copy_key: 'subAgent.cao.automation_candidates.title',
    description_copy_key: 'subAgent.cao.automation_candidates.description',
    output_schema_ref: 'schemas/sub-agents/cao/automation-candidates',
    prompt_ref: 'server/prompts/sub-agents/cao/automation-candidates.md',
    depends_on: ['cao.process_map'],
  },
  {
    id: 'cao.throughput',
    director_domain: 'automation_processes',
    agent_number_in_instructions: 3,
    title_copy_key: 'subAgent.cao.throughput.title',
    description_copy_key: 'subAgent.cao.throughput.description',
    output_schema_ref: 'schemas/sub-agents/cao/throughput',
    prompt_ref: 'server/prompts/sub-agents/cao/throughput.md',
    depends_on: ['cao.automation_candidates'],
  },
  {
    id: 'cso.case_classifier',
    director_domain: 'security_compliance',
    agent_number_in_instructions: 1,
    title_copy_key: 'subAgent.cso.case_classifier.title',
    description_copy_key: 'subAgent.cso.case_classifier.description',
    output_schema_ref: 'schemas/sub-agents/cso/case-classifier',
    prompt_ref: 'server/prompts/sub-agents/cso/case-classifier.md',
    depends_on: [],
  },
  {
    id: 'cso.threat_model',
    director_domain: 'security_compliance',
    agent_number_in_instructions: 2,
    title_copy_key: 'subAgent.cso.threat_model.title',
    description_copy_key: 'subAgent.cso.threat_model.description',
    output_schema_ref: 'schemas/sub-agents/cso/threat-model',
    prompt_ref: 'server/prompts/sub-agents/cso/threat-model.md',
    depends_on: ['cso.case_classifier'],
  },
  {
    id: 'cso.compliance_map',
    director_domain: 'security_compliance',
    agent_number_in_instructions: 3,
    title_copy_key: 'subAgent.cso.compliance_map.title',
    description_copy_key: 'subAgent.cso.compliance_map.description',
    output_schema_ref: 'schemas/sub-agents/cso/compliance-map',
    prompt_ref: 'server/prompts/sub-agents/cso/compliance-map.md',
    depends_on: ['cso.threat_model'],
  },
  {
    id: 'cto.readiness_baseline',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 1,
    title_copy_key: 'subAgent.cto.readiness_baseline.title',
    description_copy_key: 'subAgent.cto.readiness_baseline.description',
    output_schema_ref: 'schemas/sub-agents/cto/readiness-baseline',
    prompt_ref: 'server/prompts/sub-agents/cto/readiness-baseline.md',
    depends_on: [],
  },
  {
    id: 'cto.architecture_risk_model',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 2,
    title_copy_key: 'subAgent.cto.architecture_risk_model.title',
    description_copy_key: 'subAgent.cto.architecture_risk_model.description',
    output_schema_ref: 'schemas/sub-agents/cto/architecture-risk-model',
    prompt_ref: 'server/prompts/sub-agents/cto/architecture-risk-model.md',
    depends_on: ['cto.readiness_baseline'],
  },
  {
    id: 'cto.reliability_runtime',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 3,
    title_copy_key: 'subAgent.cto.reliability_runtime.title',
    description_copy_key: 'subAgent.cto.reliability_runtime.description',
    output_schema_ref: 'schemas/sub-agents/cto/reliability-runtime',
    prompt_ref: 'server/prompts/sub-agents/cto/reliability-runtime.md',
    depends_on: ['cto.readiness_baseline', 'cto.architecture_risk_model'],
  },
  {
    id: 'cto.observability_incident',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 4,
    title_copy_key: 'subAgent.cto.observability_incident.title',
    description_copy_key: 'subAgent.cto.observability_incident.description',
    output_schema_ref: 'schemas/sub-agents/cto/observability-incident',
    prompt_ref: 'server/prompts/sub-agents/cto/observability-incident.md',
    depends_on: ['cto.readiness_baseline', 'cto.reliability_runtime'],
  },
  {
    id: 'cto.delivery_release_safety',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 5,
    title_copy_key: 'subAgent.cto.delivery_release_safety.title',
    description_copy_key: 'subAgent.cto.delivery_release_safety.description',
    output_schema_ref: 'schemas/sub-agents/cto/delivery-release-safety',
    prompt_ref: 'server/prompts/sub-agents/cto/delivery-release-safety.md',
    depends_on: [
      'cto.readiness_baseline',
      'cto.reliability_runtime',
      'cto.observability_incident',
    ],
  },
  {
    id: 'cto.security_supply_chain',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 6,
    title_copy_key: 'subAgent.cto.security_supply_chain.title',
    description_copy_key: 'subAgent.cto.security_supply_chain.description',
    output_schema_ref: 'schemas/sub-agents/cto/security-supply-chain',
    prompt_ref: 'server/prompts/sub-agents/cto/security-supply-chain.md',
    depends_on: [
      'cto.readiness_baseline',
      'cto.architecture_risk_model',
      'cto.delivery_release_safety',
    ],
  },
  {
    id: 'cto.data_platform_resilience',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 7,
    title_copy_key: 'subAgent.cto.data_platform_resilience.title',
    description_copy_key: 'subAgent.cto.data_platform_resilience.description',
    output_schema_ref: 'schemas/sub-agents/cto/data-platform-resilience',
    prompt_ref: 'server/prompts/sub-agents/cto/data-platform-resilience.md',
    depends_on: [
      'cto.readiness_baseline',
      'cto.architecture_risk_model',
      'cto.delivery_release_safety',
    ],
  },
  {
    id: 'cto.roadmap_tradeoffs',
    director_domain: 'tech_infrastructure',
    agent_number_in_instructions: 8,
    title_copy_key: 'subAgent.cto.roadmap_tradeoffs.title',
    description_copy_key: 'subAgent.cto.roadmap_tradeoffs.description',
    output_schema_ref: 'schemas/sub-agents/cto/roadmap-tradeoffs',
    prompt_ref: 'server/prompts/sub-agents/cto/roadmap-tradeoffs.md',
    depends_on: [
      'cto.readiness_baseline',
      'cto.architecture_risk_model',
      'cto.reliability_runtime',
      'cto.observability_incident',
      'cto.delivery_release_safety',
      'cto.security_supply_chain',
      'cto.data_platform_resilience',
    ],
  },
  {
    id: 'seo.visibility_baseline',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 1,
    title_copy_key: 'subAgent.seo.visibility_baseline.title',
    description_copy_key: 'subAgent.seo.visibility_baseline.description',
    output_schema_ref: 'schemas/sub-agents/seo/visibility-baseline',
    prompt_ref: 'server/prompts/sub-agents/seo/visibility-baseline.md',
    depends_on: [],
  },
  {
    id: 'seo.technical_indexability',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 2,
    title_copy_key: 'subAgent.seo.technical_indexability.title',
    description_copy_key: 'subAgent.seo.technical_indexability.description',
    output_schema_ref: 'schemas/sub-agents/seo/technical-indexability',
    prompt_ref: 'server/prompts/sub-agents/seo/technical-indexability.md',
    depends_on: ['seo.visibility_baseline'],
  },
  {
    id: 'seo.ia_internal_links',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 3,
    title_copy_key: 'subAgent.seo.ia_internal_links.title',
    description_copy_key: 'subAgent.seo.ia_internal_links.description',
    output_schema_ref: 'schemas/sub-agents/seo/ia-internal-links',
    prompt_ref: 'server/prompts/sub-agents/seo/ia-internal-links.md',
    depends_on: ['seo.visibility_baseline', 'seo.technical_indexability'],
  },
  {
    id: 'seo.content_intent_coverage',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 4,
    title_copy_key: 'subAgent.seo.content_intent_coverage.title',
    description_copy_key: 'subAgent.seo.content_intent_coverage.description',
    output_schema_ref: 'schemas/sub-agents/seo/content-intent-coverage',
    prompt_ref: 'server/prompts/sub-agents/seo/content-intent-coverage.md',
    depends_on: [
      'seo.visibility_baseline',
      'seo.technical_indexability',
      'seo.ia_internal_links',
    ],
  },
  {
    id: 'seo.serp_ctr_levers',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 5,
    title_copy_key: 'subAgent.seo.serp_ctr_levers.title',
    description_copy_key: 'subAgent.seo.serp_ctr_levers.description',
    output_schema_ref: 'schemas/sub-agents/seo/serp-ctr-levers',
    prompt_ref: 'server/prompts/sub-agents/seo/serp-ctr-levers.md',
    depends_on: [
      'seo.visibility_baseline',
      'seo.technical_indexability',
      'seo.content_intent_coverage',
    ],
  },
  {
    id: 'seo.authority_trust',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 6,
    title_copy_key: 'subAgent.seo.authority_trust.title',
    description_copy_key: 'subAgent.seo.authority_trust.description',
    output_schema_ref: 'schemas/sub-agents/seo/authority-trust',
    prompt_ref: 'server/prompts/sub-agents/seo/authority-trust.md',
    depends_on: [
      'seo.visibility_baseline',
      'seo.content_intent_coverage',
      'seo.serp_ctr_levers',
    ],
  },
  {
    id: 'seo.local_international_readiness',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 7,
    title_copy_key: 'subAgent.seo.local_international_readiness.title',
    description_copy_key: 'subAgent.seo.local_international_readiness.description',
    output_schema_ref: 'schemas/sub-agents/seo/local-international-readiness',
    prompt_ref: 'server/prompts/sub-agents/seo/local-international-readiness.md',
    depends_on: [
      'seo.visibility_baseline',
      'seo.technical_indexability',
      'seo.ia_internal_links',
      'seo.content_intent_coverage',
    ],
  },
  {
    id: 'seo.measurement_experimentation',
    director_domain: 'seo_digital',
    agent_number_in_instructions: 8,
    title_copy_key: 'subAgent.seo.measurement_experimentation.title',
    description_copy_key: 'subAgent.seo.measurement_experimentation.description',
    output_schema_ref: 'schemas/sub-agents/seo/measurement-experimentation',
    prompt_ref: 'server/prompts/sub-agents/seo/measurement-experimentation.md',
    depends_on: [
      'seo.visibility_baseline',
      'seo.technical_indexability',
      'seo.ia_internal_links',
      'seo.content_intent_coverage',
      'seo.serp_ctr_levers',
      'seo.authority_trust',
      'seo.local_international_readiness',
    ],
  },
] as const;

export const DIRECTOR_SUB_AGENT_IDS = DIRECTOR_SUB_AGENTS.map((agent) => agent.id) as [
  DirectorSubAgentId,
  ...DirectorSubAgentId[],
];
