import { ORCHESTRATION_UI_COPY } from './orchestration-roadmap-ui-copy.en';

export type DirectorSubAgentOption = {
  id: 'cmo.agent_3_positioning' | 'cmo.agent_5_content_strategy' | 'cmo.agent_9_traffic';
  domainKey: 'marketing_utp';
  title: string;
  description: string;
};

export const DIRECTOR_SUB_AGENT_OPTIONS: ReadonlyArray<DirectorSubAgentOption> = [
  {
    id: 'cmo.agent_3_positioning',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_3_positioning_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_3_positioning_description,
  },
  {
    id: 'cmo.agent_5_content_strategy',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_5_content_strategy_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_5_content_strategy_description,
  },
  {
    id: 'cmo.agent_9_traffic',
    domainKey: 'marketing_utp',
    title: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_9_traffic_title,
    description: ORCHESTRATION_UI_COPY.subAgent_cmo_agent_9_traffic_description,
  },
] as const;
