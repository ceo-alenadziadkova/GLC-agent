import type { DomainKey } from '@glc/intake-core';

export type DirectorSubAgentId =
  | 'cmo.agent_3_positioning'
  | 'cmo.agent_5_content_strategy'
  | 'cmo.agent_9_traffic';

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
    id: 'cmo.agent_3_positioning',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 3,
    title_copy_key: 'subAgent.cmo.agent3.title',
    description_copy_key: 'subAgent.cmo.agent3.description',
    output_schema_ref: 'schemas/sub-agents/cmo/positioning',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-3-positioning.md',
    depends_on: [],
  },
  {
    id: 'cmo.agent_5_content_strategy',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 5,
    title_copy_key: 'subAgent.cmo.agent5.title',
    description_copy_key: 'subAgent.cmo.agent5.description',
    output_schema_ref: 'schemas/sub-agents/cmo/content-strategy',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-5-content-strategy.md',
    depends_on: ['cmo.agent_3_positioning'],
  },
  {
    id: 'cmo.agent_9_traffic',
    director_domain: 'marketing_utp',
    agent_number_in_instructions: 9,
    title_copy_key: 'subAgent.cmo.agent9.title',
    description_copy_key: 'subAgent.cmo.agent9.description',
    output_schema_ref: 'schemas/sub-agents/cmo/traffic',
    prompt_ref: 'server/prompts/sub-agents/cmo/agent-9-traffic.md',
    depends_on: ['cmo.agent_3_positioning', 'cmo.agent_5_content_strategy'],
  },
] as const;

export const DIRECTOR_SUB_AGENT_IDS = DIRECTOR_SUB_AGENTS.map((agent) => agent.id) as [
  DirectorSubAgentId,
  ...DirectorSubAgentId[],
];
