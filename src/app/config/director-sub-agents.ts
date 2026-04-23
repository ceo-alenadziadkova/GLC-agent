import type { DomainKey } from '@glc/intake-core';

import { ORCHESTRATION_UI_COPY } from './orchestration-roadmap-ui-copy.en';

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
  | 'cdo.benchmark_patterns'
  | 'cao.process_map'
  | 'cao.sop_governance'
  | 'cao.sla_targets'
  | 'cao.data_quality_gates'
  | 'cao.adoption_rollout_governance'
  | 'cao.automation_candidates'
  | 'cao.integrations_handoffs'
  | 'cao.followup_notifications'
  | 'cao.billing_quote_automation'
  | 'cao.ai_ops_guardrails'
  | 'cao.throughput'
  | 'cao.build_vs_buy'
  | 'cao.synthesis_bundle'
  | 'cso.case_classifier'
  | 'cso.threat_model'
  | 'cso.compliance_map'
  | 'cso.attack_surface_map'
  | 'cso.risk_scoring'
  | 'cso.exploitability_exposure'
  | 'cso.metrics_framework'
  | 'cso.incident_readiness'
  | 'cso.sdlc_access_governance'
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

export type DirectorSubAgentOption = {
  id: DirectorSubAgentId;
  domainKey: DomainKey;
  title: string;
  description: string;
};

export const DIRECTOR_SUB_AGENT_OPTIONS: ReadonlyArray<DirectorSubAgentOption> = [
  {
    id: 'cmo.agent_1_market',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_1_market_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_1_market_description,
  },
  {
    id: 'cmo.agent_2_awareness_ladder',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_2_awareness_ladder_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_2_awareness_ladder_description,
  },
  {
    id: 'cmo.agent_3_positioning',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_3_positioning_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_3_positioning_description,
  },
  {
    id: 'cmo.agent_4_voice',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_4_voice_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_4_voice_description,
  },
  {
    id: 'cmo.agent_5_content_strategy',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_5_content_strategy_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_5_content_strategy_description,
  },
  {
    id: 'cmo.agent_6_viral',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_6_viral_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_6_viral_description,
  },
  {
    id: 'cmo.agent_7_storytelling',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_7_storytelling_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_7_storytelling_description,
  },
  {
    id: 'cmo.agent_8_ready_posts',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_8_ready_posts_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_8_ready_posts_description,
  },
  {
    id: 'cmo.agent_9_traffic',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_9_traffic_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_9_traffic_description,
  },
  {
    id: 'cmo.agent_10_distribution',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_10_distribution_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_10_distribution_description,
  },
  {
    id: 'cmo.agent_11_founder_brand',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_11_founder_brand_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_11_founder_brand_description,
  },
  {
    id: 'cmo.agent_12_growth_loops',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_12_growth_loops_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_12_growth_loops_description,
  },
  {
    id: 'cdo.user_intent',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_user_intent_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_user_intent_description,
  },
  {
    id: 'cdo.funnel_architect',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_funnel_architect_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_funnel_architect_description,
  },
  {
    id: 'cdo.value_proposition',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_value_proposition_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_value_proposition_description,
  },
  {
    id: 'cdo.friction',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_friction_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_friction_description,
  },
  {
    id: 'cdo.trust_credibility',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_trust_credibility_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_trust_credibility_description,
  },
  {
    id: 'cdo.behavioral_psychology',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_behavioral_psychology_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_behavioral_psychology_description,
  },
  {
    id: 'cdo.ui_consistency',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_ui_consistency_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_ui_consistency_description,
  },
  {
    id: 'cdo.copy_microcopy',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_copy_microcopy_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_copy_microcopy_description,
  },
  {
    id: 'cdo.experimentation',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_experimentation_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_experimentation_description,
  },
  {
    id: 'cdo.analytics_tracking',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_analytics_tracking_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_analytics_tracking_description,
  },
  {
    id: 'cdo.benchmark_patterns',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_benchmark_patterns_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_benchmark_patterns_description,
  },
  {
    id: 'cao.process_map',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_process_map_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_process_map_description,
  },
  {
    id: 'cao.sop_governance',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_sop_governance_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_sop_governance_description,
  },
  {
    id: 'cao.sla_targets',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_sla_targets_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_sla_targets_description,
  },
  {
    id: 'cao.data_quality_gates',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_data_quality_gates_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_data_quality_gates_description,
  },
  {
    id: 'cao.adoption_rollout_governance',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_adoption_rollout_governance_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_adoption_rollout_governance_description,
  },
  {
    id: 'cao.automation_candidates',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_automation_candidates_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_automation_candidates_description,
  },
  {
    id: 'cao.integrations_handoffs',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_integrations_handoffs_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_integrations_handoffs_description,
  },
  {
    id: 'cao.followup_notifications',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_followup_notifications_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_followup_notifications_description,
  },
  {
    id: 'cao.billing_quote_automation',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_billing_quote_automation_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_billing_quote_automation_description,
  },
  {
    id: 'cao.ai_ops_guardrails',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_ai_ops_guardrails_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_ai_ops_guardrails_description,
  },
  {
    id: 'cao.throughput',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_throughput_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_throughput_description,
  },
  {
    id: 'cao.build_vs_buy',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_build_vs_buy_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_build_vs_buy_description,
  },
  {
    id: 'cao.synthesis_bundle',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_synthesis_bundle_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_synthesis_bundle_description,
  },
  {
    id: 'cso.case_classifier',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_case_classifier_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_case_classifier_description,
  },
  {
    id: 'cso.threat_model',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_threat_model_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_threat_model_description,
  },
  {
    id: 'cso.compliance_map',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_compliance_map_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_compliance_map_description,
  },
  {
    id: 'cso.attack_surface_map',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_attack_surface_map_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_attack_surface_map_description,
  },
  {
    id: 'cso.risk_scoring',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_risk_scoring_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_risk_scoring_description,
  },
  {
    id: 'cso.exploitability_exposure',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_exploitability_exposure_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_exploitability_exposure_description,
  },
  {
    id: 'cso.metrics_framework',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_metrics_framework_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_metrics_framework_description,
  },
  {
    id: 'cso.incident_readiness',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_incident_readiness_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_incident_readiness_description,
  },
  {
    id: 'cso.sdlc_access_governance',
    domainKey: 'security_compliance',
    title: ORCHESTRATION_UI_COPY.subAgent_cso_sdlc_access_governance_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cso_sdlc_access_governance_description,
  },
  {
    id: 'cto.readiness_baseline',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_readiness_baseline_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_readiness_baseline_description,
  },
  {
    id: 'cto.architecture_risk_model',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_architecture_risk_model_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_architecture_risk_model_description,
  },
  {
    id: 'cto.reliability_runtime',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_reliability_runtime_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_reliability_runtime_description,
  },
  {
    id: 'cto.observability_incident',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_observability_incident_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_observability_incident_description,
  },
  {
    id: 'cto.delivery_release_safety',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_delivery_release_safety_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_delivery_release_safety_description,
  },
  {
    id: 'cto.security_supply_chain',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_security_supply_chain_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_security_supply_chain_description,
  },
  {
    id: 'cto.data_platform_resilience',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_data_platform_resilience_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_data_platform_resilience_description,
  },
  {
    id: 'cto.roadmap_tradeoffs',
    domainKey: 'tech_infrastructure',
    title: ORCHESTRATION_UI_COPY.subAgent_cto_roadmap_tradeoffs_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cto_roadmap_tradeoffs_description,
  },
  {
    id: 'seo.visibility_baseline',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_visibility_baseline_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_visibility_baseline_description,
  },
  {
    id: 'seo.technical_indexability',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_technical_indexability_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_technical_indexability_description,
  },
  {
    id: 'seo.ia_internal_links',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_ia_internal_links_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_ia_internal_links_description,
  },
  {
    id: 'seo.content_intent_coverage',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_content_intent_coverage_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_content_intent_coverage_description,
  },
  {
    id: 'seo.serp_ctr_levers',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_serp_ctr_levers_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_serp_ctr_levers_description,
  },
  {
    id: 'seo.authority_trust',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_authority_trust_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_authority_trust_description,
  },
  {
    id: 'seo.local_international_readiness',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_local_international_readiness_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_local_international_readiness_description,
  },
  {
    id: 'seo.measurement_experimentation',
    domainKey: 'seo_digital',
    title: ORCHESTRATION_UI_COPY.subAgent_seo_measurement_experimentation_title,
    description: ORCHESTRATION_UI_COPY.subAgent_seo_measurement_experimentation_description,
  },
] as const;
