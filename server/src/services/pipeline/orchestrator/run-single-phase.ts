import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../../../config/pipeline-orchestrator-copy.js';
import {
  PIPELINE_AUDIT_ORCHESTRATOR_STATUS,
  pipelineStatusForPhase,
} from '../../../config/pipeline-status.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import {
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  PHASE_DOMAIN_MAP,
  reviewPhasesForExecutionPlan,
  type AuditExecutionPlan,
  type DomainKey,
} from '../../../types/audit.js';
import { assertBriefReady } from '../../brief-validator.js';
import { logger } from '../../logger.js';
import { supabase } from '../../supabase.js';
import { reopenHumanReviewPointForPhase } from '../reviewGateCoordinator.js';
import { runPhaseDomainExecution, type PhaseDomainExecutionDeps } from '../phaseRunner.js';
import { auditDomainRowShouldTrackFailure } from './domain-phase-policy.js';
import { PipelineCancelledError } from './pipeline-cancelled.error.js';
import type { PhaseAgentConstructor } from './phase-agent-registry.js';

export type SequentialPhaseOutcome = 'completed' | 'cancelled';

/** Sequential phases return a terminal outcome; isolated (parallel) phases return nothing. */
export type RunSinglePhaseLifecycleOutcome = SequentialPhaseOutcome | undefined;

export type EmitPipelineEventFn = (
  phase: number,
  eventType: string,
  message: string,
  data?: Record<string, unknown>,
) => Promise<void>;

export type RunSinglePhaseLifecycleParams = {
  mode: 'sequential' | 'isolated';
  auditId: string;
  phase: number;
  agentClass: PhaseAgentConstructor;
  emitEvent: EmitPipelineEventFn;
  assertNotCancelled: () => Promise<void>;
  updateAuditIfNotCancelled: (patch: Record<string, unknown>) => Promise<boolean>;
  attachPriorControlObjects: PhaseDomainExecutionDeps['attachPriorControlObjects'];
  publishControlObjectGovernance: PhaseDomainExecutionDeps['publishControlObjectGovernance'];
  /** Required when mode is `sequential` (plan gates + review). */
  getExecutionPlan?: () => Promise<AuditExecutionPlan>;
};

async function markAuditDomainFailed(auditId: string, domainKey: DomainKey): Promise<void> {
  await supabase
    .from('audit_domains')
    .update({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.failed })
    .eq('audit_id', auditId)
    .eq('domain_key', domainKey);
}

export async function runSinglePhaseWithLifecycle(
  params: RunSinglePhaseLifecycleParams,
): Promise<RunSinglePhaseLifecycleOutcome> {
  const {
    mode,
    auditId,
    phase,
    agentClass,
    emitEvent,
    assertNotCancelled,
    updateAuditIfNotCancelled,
    attachPriorControlObjects,
    publishControlObjectGovernance,
    getExecutionPlan,
  } = params;

  const domainKey = PHASE_DOMAIN_MAP[phase];

  try {
    await assertNotCancelled();

    let executionPlan: AuditExecutionPlan | undefined;
    if (mode === 'sequential') {
      if (!getExecutionPlan) {
        throw new Error('getExecutionPlan is required for sequential phase execution');
      }
      executionPlan = await getExecutionPlan();
      const availablePhases = executionPlanToPhases(executionPlan);
      const maxPhase = maxPhaseForExecutionPlan(executionPlan);
      if (!availablePhases.includes(phase)) {
        throw new Error(`Phase ${phase} is not available for execution plan (max: ${maxPhase})`);
      }
      if (phase === 0) {
        await assertBriefReady(auditId);
      }
    }

    const oc = pipelineOrchestratorCopy();
    if (mode === 'sequential') {
      const moved = await updateAuditIfNotCancelled({
        status: pipelineStatusForPhase(phase),
        current_phase: phase,
      });
      if (!moved) throw new PipelineCancelledError();
    }

    await emitEvent(
      phase,
      PIPELINE_EVENT_TYPES.started,
      interpolateOrchestratorMessage(oc.phase.startedTemplate, { phase, domain: domainKey }),
    );

    const result = await runPhaseDomainExecution({
      auditId,
      phase,
      domainKey,
      AgentClass: agentClass,
      attachPriorControlObjects,
      publishControlObjectGovernance,
    });

    if (mode === 'sequential' && executionPlan) {
      const reviewPhases = reviewPhasesForExecutionPlan(executionPlan);
      if ((reviewPhases as readonly number[]).includes(phase)) {
        await reopenHumanReviewPointForPhase(auditId, phase);
        await emitEvent(phase, PIPELINE_EVENT_TYPES.reviewNeeded, oc.phase.reviewNeeded);
        const reviewSet = await updateAuditIfNotCancelled({
          status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.review,
        });
        if (!reviewSet) throw new PipelineCancelledError();
      }
    }

    await emitEvent(
      phase,
      PIPELINE_EVENT_TYPES.completed,
      interpolateOrchestratorMessage(oc.phase.completedTemplate, { phase }),
      {
        score: result.score > 0 ? result.score : undefined,
      },
    );
    return mode === 'sequential' ? 'completed' : undefined;
  } catch (err) {
    const error = err as Error;
    if (error instanceof PipelineCancelledError) {
      if (mode === 'sequential') {
        logger.info('Pipeline phase cancelled', { audit_id: auditId, phase });
        return 'cancelled';
      }
      logger.info('Pipeline isolated phase cancelled', { audit_id: auditId, phase });
      throw err;
    }

    if (mode === 'sequential') {
      logger.error('Pipeline phase failed', {
        audit_id: auditId,
        phase,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.error('Pipeline parallel phase failed', {
        audit_id: auditId,
        phase,
        error: error.message,
        stack: error.stack,
      });
    }

    if (auditDomainRowShouldTrackFailure(domainKey)) {
      await markAuditDomainFailed(auditId, domainKey);
    }

    const ocErr = pipelineOrchestratorCopy();
    if (mode === 'sequential') {
      await updateAuditIfNotCancelled({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.failed });
      await emitEvent(phase, PIPELINE_EVENT_TYPES.error, ocErr.errors.phaseFailedUserMessage, {
        error_code: ocErr.errors.phaseFailedCode,
        phase,
        domain_key: auditDomainRowShouldTrackFailure(domainKey) ? domainKey : undefined,
      });
    } else {
      await emitEvent(phase, PIPELINE_EVENT_TYPES.error, ocErr.errors.parallelPhaseFailedUserMessage, {
        error_code: ocErr.errors.parallelPhaseFailedCode,
        phase,
        domain_key: auditDomainRowShouldTrackFailure(domainKey) ? domainKey : undefined,
      });
    }

    throw err;
  }
}
