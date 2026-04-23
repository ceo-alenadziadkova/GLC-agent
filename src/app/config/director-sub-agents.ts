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
  | 'cdo.funnel_architect'
  | 'cdo.friction'
  | 'cdo.experimentation'
  | 'cao.process_map'
  | 'cao.automation_candidates'
  | 'cao.throughput'
  | 'cso.case_classifier'
  | 'cso.threat_model'
  | 'cso.compliance_map';

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
    id: 'cdo.funnel_architect',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_funnel_architect_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_funnel_architect_description,
  },
  {
    id: 'cdo.friction',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_friction_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_friction_description,
  },
  {
    id: 'cdo.experimentation',
    domainKey: 'ux_conversion',
    title: ORCHESTRATION_UI_COPY.subAgent_cdo_experimentation_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cdo_experimentation_description,
  },
  {
    id: 'cao.process_map',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_process_map_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_process_map_description,
  },
  {
    id: 'cao.automation_candidates',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_automation_candidates_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_automation_candidates_description,
  },
  {
    id: 'cao.throughput',
    domainKey: 'automation_processes',
    title: ORCHESTRATION_UI_COPY.subAgent_cao_throughput_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cao_throughput_description,
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
] as const;
