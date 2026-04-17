import { ReconAgent } from '../../../agents/recon.js';
import { TechAgent } from '../../../agents/tech.js';
import { SecurityAgent } from '../../../agents/security.js';
import { SeoAgent } from '../../../agents/seo.js';
import { UxAgent } from '../../../agents/ux.js';
import { MarketingAgent } from '../../../agents/marketing.js';
import { AutomationAgent } from '../../../agents/automation.js';
import { StrategyAgent } from '../../../agents/strategy.js';
import type { BaseAgent } from '../../../agents/base.js';

export type PhaseAgentConstructor = new (auditId: string) => BaseAgent;

export const PHASE_AGENT_REGISTRY: Record<number, PhaseAgentConstructor> = {
  0: ReconAgent,
  1: TechAgent,
  2: SecurityAgent,
  3: SeoAgent,
  4: UxAgent,
  5: MarketingAgent,
  6: AutomationAgent,
  7: StrategyAgent,
};

export function getPhaseAgentClass(phase: number): PhaseAgentConstructor | undefined {
  return PHASE_AGENT_REGISTRY[phase];
}
