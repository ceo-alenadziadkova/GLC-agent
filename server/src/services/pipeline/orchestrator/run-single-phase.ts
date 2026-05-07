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
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import { isLikelyTransientSupabaseError, sleepMs } from '../../../lib/supabase-rest-transient.js';
import { logger } from '../../logger.js';
import { supabase } from '../../supabase.js';
import { reopenHumanReviewPointForPhase } from '../reviewGateCoordinator.js';
import { runPhaseDomainExecution, type PhaseDomainExecutionDeps } from '../phaseRunner.js';
import { maybeAutoPersistOrchestrationPackAfterStrategy } from '../../orchestration/orchestration-pack-persist-run.service.js';
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
  /**
   * Consultant `POST .../pipeline/retry` for phases 1–6 only. Parallel wing runs keep the default
   * `false` so idempotent replays skip domains that already saved `completed`.
   */
  isolationConsultantRetryBypassAlreadyCompleted?: boolean;
  /** Optional hook for phase-specific gate persistence that must happen before `reviewNeeded`. */
  beforeSequentialReviewGate?: (phase: number) => Promise<void>;
};

async function markAuditDomainFailed(auditId: string, domainKey: DomainKey): Promise<void> {
  await supabase
    .from('audit_domains')
    .update({ status: PIPELINE_AUDIT_ORCHESTRATOR_STATUS.failed })
    .eq('audit_id', auditId)
    .eq('domain_key', domainKey);
}

async function isDomainPhaseAlreadyCompleted(auditId: string, domainKey: DomainKey): Promise<boolean> {
  const policy = SYSTEM_DEFAULTS.pipelineOrchestrator;
  const maxAttempts = policy.completedDomainReadRetryMaxAttempts;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data: latest, error } = await supabase
      .from('audit_domains')
      .select('status')
      .eq('audit_id', auditId)
      .eq('domain_key', domainKey)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      return latest?.status === 'completed';
    }

    const retryable = isLikelyTransientSupabaseError(error) && attempt < maxAttempts;
    if (retryable) {
      const backoffMs =
        policy.completedDomainReadRetryBaseDelayMs * 2 ** (attempt - 1) +
        Math.floor(Math.random() * (policy.completedDomainReadRetryJitterMs + 1));
      logger.warn('pipeline.completed_domain_read_retry', {
        component: 'pipeline_orchestrator',
        audit_id: auditId,
        domain_key: domainKey,
        attempt,
        max_attempts: maxAttempts,
        error: error.message,
        code: error.code,
      });
      await sleepMs(backoffMs);
      continue;
    }

    logger.error('pipeline.completed_domain_read_failed', {
      component: 'pipeline_orchestrator',
      audit_id: auditId,
      domain_key: domainKey,
      attempt,
      max_attempts: maxAttempts,
      error: error.message,
      code: error.code,
    });
    throw new Error(`Failed to read latest domain status for ${domainKey}: ${error.message}`);
  }

  return false;
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
    isolationConsultantRetryBypassAlreadyCompleted = false,
    beforeSequentialReviewGate,
  } = params;

  const domainKey = PHASE_DOMAIN_MAP[phase];

  try {
    await assertNotCancelled();
    if (
      mode === 'isolated' &&
      auditDomainRowShouldTrackFailure(domainKey) &&
      !isolationConsultantRetryBypassAlreadyCompleted
    ) {
      const alreadyCompleted = await isDomainPhaseAlreadyCompleted(auditId, domainKey);
      if (alreadyCompleted) {
        await emitEvent(
          phase,
          PIPELINE_EVENT_TYPES.log,
          `Skipping phase ${phase}: ${domainKey} already completed`,
          { domain_key: domainKey, skipped: true, reason: 'already_completed' },
        );
        return undefined;
      }
    }

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
        await beforeSequentialReviewGate?.(phase);
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
    if (phase === 7) {
      await maybeAutoPersistOrchestrationPackAfterStrategy({ auditId });
    }
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
