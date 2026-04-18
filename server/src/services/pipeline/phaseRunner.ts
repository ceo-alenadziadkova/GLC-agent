import { supabase } from '../supabase.js';
import { banditService, DEFAULT_VARIANT_ID } from '../bandit.js';
import type { BaseAgent } from '../../agents/base.js';
import type { ControlObjectV1 } from '../../schemas/control-object/index.js';
import { findVariant } from '../../config/agent-variants.js';
import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../../config/pipeline-orchestrator-copy.js';
import type { DomainKey, DomainResult } from '../../types/audit.js';

type AgentConstructor = new (auditId: string) => BaseAgent;

export type PhaseDomainExecutionDeps = {
  auditId: string;
  phase: number;
  domainKey: DomainKey | 'recon' | 'strategy';
  AgentClass: AgentConstructor;
  attachPriorControlObjects: (agent: BaseAgent, domainKey: DomainKey) => Promise<void>;
  publishControlObjectGovernance: (
    phase: number,
    controlObject: ControlObjectV1,
    evaluationCapture: {
      phaseId: DomainKey;
      rawAgentOutput: Record<string, unknown> | null;
      cleanedOutput: DomainResult;
    }
  ) => Promise<void>;
};

export function buildPhaseStartedMessage(phase: number, domain: DomainKey | 'recon' | 'strategy'): string {
  const oc = pipelineOrchestratorCopy();
  return interpolateOrchestratorMessage(oc.phase.startedTemplate, { phase, domain });
}

export function buildPhaseCompletedMessage(phase: number): string {
  const oc = pipelineOrchestratorCopy();
  return interpolateOrchestratorMessage(oc.phase.completedTemplate, { phase });
}

/**
 * Runs a single phase agent and persists:
 * - audit_domains.status='collecting' (when applicable)
 * - bandit variant selection (when applicable)
 * - publishControlObjectGovernance (when domainKey is not recon/strategy)
 * - agent.saveDomainResult (when domainKey is not recon/strategy)
 *
 * Event emission is handled by the caller (different semantics between sequential and parallel blocks).
 */
export async function runPhaseDomainExecution(
  deps: PhaseDomainExecutionDeps,
): Promise<DomainResult> {
  const { auditId, phase, domainKey, AgentClass, attachPriorControlObjects, publishControlObjectGovernance } = deps;

  if (domainKey !== 'recon' && domainKey !== 'strategy') {
    await supabase
      .from('audit_domains')
      .update({ status: 'collecting' })
      .eq('audit_id', auditId)
      .eq('domain_key', domainKey);
  }

  const agent = new AgentClass(auditId);

  if (domainKey !== 'recon' && domainKey !== 'strategy') {
    const banditResult = await banditService.selectVariant(domainKey as DomainKey);
    agent.selectedVariantId = banditResult.variant_id;
    if (banditResult.variant_id !== DEFAULT_VARIANT_ID) {
      const variant = findVariant(domainKey as DomainKey, banditResult.variant_id);
      if (variant) agent.variantDelta = variant;
    }

    await attachPriorControlObjects(agent, domainKey as DomainKey);
  }

  const result = await agent.run();

  if (domainKey !== 'recon' && domainKey !== 'strategy') {
    const controlObject = agent.lastControlObject;
    if (controlObject) {
      await publishControlObjectGovernance(phase, controlObject, {
        phaseId: domainKey as DomainKey,
        rawAgentOutput: agent.lastRawDomainResult,
        cleanedOutput: result,
      });
    }

    await agent.saveDomainResult(result);
  }

  return result;
}

