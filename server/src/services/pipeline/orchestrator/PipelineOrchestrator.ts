import { pipelineOrchestratorCopy } from '../../../config/pipeline-orchestrator-copy.js';
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import {
  getAutoLoopAllowedModes,
  getAutoLoopExecutionProfile,
  isAutoLoopEnabled,
  isBanditsEnabled,
  isCausalDagEnabled,
} from '../../../config/feature-flags.js';
import { recordAgentPerformance } from '../../agent-performance.js';
import { assertAuditNotCancelled, updateAuditIfNotCancelled as updateAuditIfNotCancelledGuard } from './audit-cancel-guard.js';
import { banditService, DEFAULT_VARIANT_ID } from '../../bandit.js';
import type { BaseAgent } from '../../../agents/base.js';
import { logger } from '../../logger.js';
import { type DomainKey, type DomainResult, type FreeSnapshotPreview } from '../../../types/audit.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import { fetchPriorControlObjectsForPhase } from '../../control-object-history.js';
import { publishControlObjectGovernanceCore } from '../governance/controlObjectGovernance.js';
import { attemptAutoLoop as attemptAutoLoopService } from '../autoLoop/autoLoopService.js';
import { runFreeSnapshotService } from '../freeSnapshotService.js';
import { writePipelineEventAndPhaseRun } from '../events/eventWriter.js';
import { maybePublishPipelineNotification } from '../events/notificationPublisher.js';
import { getPhaseAgentClass } from './phase-agent-registry.js';
import { loadNormalizedExecutionPlanForAudit } from './execution-plan-loader.js';
import { PipelineCancelledError } from './pipeline-cancelled.error.js';
import { runParallelBlockForAudit } from './parallel-block.js';
import { runPipelineOrchestratorBlock } from './run-block.js';
import { runSinglePhaseWithLifecycle } from './run-single-phase.js';

const STALLED_PHASE_TIMEOUT_MIN = SYSTEM_DEFAULTS.pipelineOrchestrator.stalledPhaseTimeoutMin;
const PARALLEL_FAILURE_THRESHOLD = SYSTEM_DEFAULTS.pipelineOrchestrator.parallelFailureThreshold;

function agentClassForPhaseOrThrow(phase: number) {
  const AgentClass = getPhaseAgentClass(phase);
  if (!AgentClass) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  return AgentClass;
}

/**
 * Pipeline Orchestrator
 *
 * Phase sequencing:
 *   Phase 0 (Recon) → Gate 1 → Phases 1-4 (parallel auto) → Gate 2
 *   → Phases 5-6 (parallel analytic) → Phase 7 (Strategy) → Gate 3
 *
 * Each phase: COLLECT → ASSEMBLE → CALL CLAUDE → FACT-CHECK → SAVE
 */
export class PipelineOrchestrator {
  private auditId: string;
  private readonly disableAutoRemediate: boolean;

  constructor(auditId: string, options?: { disableAutoRemediate?: boolean }) {
    this.auditId = auditId;
    this.disableAutoRemediate = options?.disableAutoRemediate ?? false;
  }

  private async updateAuditIfNotCancelled(patch: Record<string, unknown>): Promise<boolean> {
    return updateAuditIfNotCancelledGuard(this.auditId, patch);
  }

  private async assertNotCancelled(): Promise<void> {
    return assertAuditNotCancelled(this.auditId);
  }

  /** Loads latest upstream CONTROL_OBJECT snapshots for causal DAG premise validation. */
  private async attachPriorControlObjects(agent: BaseAgent, domainKey: DomainKey): Promise<void> {
    if (!isCausalDagEnabled()) return;
    agent.priorControlObjectsByPhase = await fetchPriorControlObjectsForPhase(this.auditId, domainKey);
  }

  /**
   * Applies DecisionLayer (sets canonical `decision_hint`), persists CONTROL_OBJECT v2.0,
   * records agent performance, and emits `refine_recommended` (or triggers auto-loop if enabled).
   */
  private async publishControlObjectGovernance(
    phase: number,
    controlObject: ControlObjectV1,
    evaluationCapture?: {
      phaseId: DomainKey;
      rawAgentOutput: Record<string, unknown> | null;
      cleanedOutput: DomainResult;
    },
  ): Promise<void> {
    const decision = await publishControlObjectGovernanceCore({
      auditId: this.auditId,
      disableAutoRemediate: this.disableAutoRemediate,
      phase,
      controlObject,
      evaluationCapture,
      emitEvent: this.emitEvent.bind(this),
      recordPerformanceAsync: this.recordPerformanceAsync.bind(this),
      recordBanditArmAsync: this.recordBanditArmAsync.bind(this),
    });

    if (decision?.hint === 'refine') {
      const oc = pipelineOrchestratorCopy();

      if (await this.shouldAttemptAutoLoop()) {
        const looped = await attemptAutoLoopService({
          auditId: this.auditId,
          phase,
          originalControlObject: controlObject,
          activeErrorTypes: decision.active_error_types,
          disableAutoRemediate: this.disableAutoRemediate,
          agentClassForPhase: (p) => agentClassForPhaseOrThrow(p),
          attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
          recordBanditArmAsync: this.recordBanditArmAsync.bind(this),
          emitEvent: this.emitEvent.bind(this),
        });
        if (looped) return;
      }

      await this.emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.refineRecommended,
        oc.phase.refineRecommendedMessage,
        {
          decision_hint: decision.hint,
          reasoning: decision.reasoning,
          active_error_types: decision.active_error_types,
          control_object: controlObject,
        },
      );
    }
  }

  private recordBanditArmAsync(controlObject: ControlObjectV1): void {
    if (!isBanditsEnabled()) return;
    const pid = controlObject.context.phase_id;
    if (pid === 'recon' || pid === 'strategy') return;
    const metrics = controlObject.agent_performance;
    if (!metrics) return;
    const variantId = controlObject.context.selected_variant_id ?? DEFAULT_VARIANT_ID;
    void banditService.recordArmResult(pid as DomainKey, variantId, metrics.agent_score);
  }

  private async recordPerformanceAsync(controlObject: ControlObjectV1, phase: number): Promise<void> {
    try {
      const metrics = controlObject.agent_performance;
      if (metrics) {
        await recordAgentPerformance({
          phase_id: controlObject.context.phase_id,
          agent_number: phase,
          evaluation_count: 1,
          hallucination_rate: metrics.hallucination_rate,
          risky_promise_rate: metrics.risky_promise_rate,
          unverified_rate: metrics.unverified_rate,
          inconsistency_rate: metrics.inconsistency_rate,
          agent_score: metrics.agent_score,
        });
      }
    } catch (err) {
      logger.warn('pipeline.performance_record_failed', {
        component: 'pipeline',
        audit_id: this.auditId,
        phase,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async shouldAttemptAutoLoop(): Promise<boolean> {
    if (!isAutoLoopEnabled()) return false;

    const profile = getAutoLoopExecutionProfile();
    if (!profile) {
      logger.warn('pipeline.auto_loop_skipped_missing_deployment_profile', {
        component: 'pipeline',
        audit_id: this.auditId,
        hint:
          'Set GLC_DEPLOYMENT_PROFILE to a value in AUTO_LOOP_ALLOWED_MODES (default sandbox,internal). Legacy: NODE_ENV is accepted only when it matches that allowlist.',
      });
      return false;
    }
    const allowedModes = getAutoLoopAllowedModes();
    if (!allowedModes.includes(profile)) {
      logger.info('pipeline.auto_loop_skipped_env', {
        component: 'pipeline',
        audit_id: this.auditId,
        deployment_profile: profile,
        allowed: allowedModes,
      });
      return false;
    }

    return true;
  }

  private async getExecutionPlan() {
    return loadNormalizedExecutionPlanForAudit(this.auditId);
  }

  /**
   * Start a specific phase (sequential, single-phase path).
   * Handles audit-level status updates, review gates, and full error propagation.
   * Used for Phase 0 (Recon), Phase 7 (Strategy), and direct retry calls.
   */
  async startPhase(phase: number): Promise<void> {
    const agentClass = agentClassForPhaseOrThrow(phase);
    await runSinglePhaseWithLifecycle({
      mode: 'sequential',
      auditId: this.auditId,
      phase,
      agentClass,
      emitEvent: this.emitEvent.bind(this),
      assertNotCancelled: () => this.assertNotCancelled(),
      updateAuditIfNotCancelled: (p) => this.updateAuditIfNotCancelled(p),
      attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
      publishControlObjectGovernance: this.publishControlObjectGovernance.bind(this),
      getExecutionPlan: () => this.getExecutionPlan(),
    });
  }

  private async startPhaseIsolated(phase: number): Promise<void> {
    const agentClass = agentClassForPhaseOrThrow(phase);
    await runSinglePhaseWithLifecycle({
      mode: 'isolated',
      auditId: this.auditId,
      phase,
      agentClass,
      emitEvent: this.emitEvent.bind(this),
      assertNotCancelled: () => this.assertNotCancelled(),
      updateAuditIfNotCancelled: (p) => this.updateAuditIfNotCancelled(p),
      attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
      publishControlObjectGovernance: this.publishControlObjectGovernance.bind(this),
    });
  }

  private async runParallelBlock(phases: readonly number[]): Promise<string[]> {
    return runParallelBlockForAudit({
      phases,
      parallelFailureThreshold: PARALLEL_FAILURE_THRESHOLD,
      emitEvent: this.emitEvent.bind(this),
      updateAuditIfNotCancelled: (p) => this.updateAuditIfNotCancelled(p),
      runIsolatedPhase: (p) => this.startPhaseIsolated(p),
    });
  }

  /**
   * Run the next block of phases from the current pipeline position.
   *
   * Called by POST /api/audits/:id/pipeline/next (and after review approvals).
   */
  async runBlock(): Promise<void> {
    return runPipelineOrchestratorBlock({
      auditId: this.auditId,
      loadExecutionPlan: () => this.getExecutionPlan(),
      updateAuditIfNotCancelled: (p) => this.updateAuditIfNotCancelled(p),
      runParallelBlock: (phases) => this.runParallelBlock(phases),
      startPhaseSequential: (p) => this.startPhase(p),
      emitEvent: this.emitEvent.bind(this),
      cancelledErrorFactory: () => new PipelineCancelledError(),
    });
  }

  async runFreeSnapshot(): Promise<FreeSnapshotPreview> {
    return runFreeSnapshotService({
      auditId: this.auditId,
      emitEvent: this.emitEvent.bind(this),
    });
  }

  private async emitEvent(
    phase: number,
    eventType: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await writePipelineEventAndPhaseRun({
      auditId: this.auditId,
      phase,
      eventType,
      message,
      data,
      leaseTimeoutMinutes: STALLED_PHASE_TIMEOUT_MIN,
    });

    await maybePublishPipelineNotification({
      auditId: this.auditId,
      phase,
      eventType,
      message,
      data,
    });
  }
}
