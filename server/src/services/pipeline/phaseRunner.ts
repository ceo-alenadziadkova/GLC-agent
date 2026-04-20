import { supabase } from '../supabase.js';
import { banditService, DEFAULT_VARIANT_ID } from '../bandit.js';
import type { BaseAgent } from '../../agents/base.js';
import type { ControlObjectV1, PhaseId } from '../../schemas/control-object/index.js';
import { findVariant } from '../../config/agent-variants.js';
import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../../config/pipeline-orchestrator-copy.js';
import type { DomainKey, DomainResult } from '../../types/audit.js';
import { logger } from '../logger.js';
import { persistGlcDirectorOrchestrationSliceForAuditOwner } from '../orchestration/director-orchestration-persistence.service.js';
import {
  directorOrchestrationPersistenceModeForPhase,
  isDirectorOrchestrationPhaseAllowed,
} from '../../config/director-orchestration-policy.js';
import { extractGlcDirectorOrchestrationSliceFromAgentOutput } from '../orchestration/extract-glc-director-slice-from-agent-output.js';

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
      phaseId: PhaseId;
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
 * - publishControlObjectGovernance (domain phases + strategy narrow governance)
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

  if (domainKey === 'strategy') {
    if (agent.lastControlObject) {
      await publishControlObjectGovernance(phase, agent.lastControlObject, {
        phaseId: 'strategy',
        rawAgentOutput: agent.lastRawDomainResult,
        cleanedOutput: result,
      });
    }
    const withFinalize = agent as BaseAgent & { finalizeStrategyPersistence?: () => Promise<void> };
    if (typeof withFinalize.finalizeStrategyPersistence === 'function') {
      await withFinalize.finalizeStrategyPersistence();
    }
  }

  if (domainKey !== 'recon' && domainKey !== 'strategy') {
    const controlObject = agent.lastControlObject;
    if (controlObject) {
      await publishControlObjectGovernance(phase, controlObject, {
        phaseId: domainKey as DomainKey,
        rawAgentOutput: agent.lastRawDomainResult,
        cleanedOutput: result,
      });
    }

    if (isDirectorOrchestrationPhaseAllowed(phase)) {
      const directorSlice = extractGlcDirectorOrchestrationSliceFromAgentOutput(agent.lastRawDomainResult);
      const persistenceMode = directorOrchestrationPersistenceModeForPhase(phase);
      if (directorSlice) {
        const persistDirector = await persistGlcDirectorOrchestrationSliceForAuditOwner({
          auditId,
          domainKey: domainKey as DomainKey,
          slice: directorSlice,
          mode: persistenceMode,
        });
        if (persistDirector.error) {
          logger.warn('pipeline.director_orchestration_slice_persist_failed', {
            auditId,
            phase,
            domainKey,
            mode: persistenceMode,
            message: persistDirector.error.message,
          });
          if (persistenceMode === 'strict_for_selected_domains') {
            throw persistDirector.error;
          }
        }
      } else if (persistenceMode === 'strict_for_selected_domains') {
        logger.warn('pipeline.director_orchestration_slice_missing', {
          auditId,
          phase,
          domainKey,
          mode: persistenceMode,
        });
      }
    }

    await agent.saveDomainResult(result);
  }

  return result;
}

