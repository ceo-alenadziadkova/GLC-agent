import type { DomainKey } from '@glc/intake-core';

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
  | 'cmo.agent_12_growth_loops';

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
] as const;

export const DIRECTOR_SUB_AGENT_IDS = DIRECTOR_SUB_AGENTS.map((agent) => agent.id) as [
  DirectorSubAgentId,
  ...DirectorSubAgentId[],
];
