import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../config/pipeline-orchestrator-copy.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  getAutoLoopAllowedModes,
  getAutoLoopExecutionProfile,
  isAutoLoopEnabled,
  isBanditsEnabled,
  isCausalDagEnabled,
} from '../config/feature-flags.js';
import { supabase } from './supabase.js';
import { assertBriefReady } from './brief-validator.js';
import { ReconAgent } from '../agents/recon.js';
import { TechAgent } from '../agents/tech.js';
import { SecurityAgent } from '../agents/security.js';
import { SeoAgent } from '../agents/seo.js';
import { UxAgent } from '../agents/ux.js';
import { MarketingAgent } from '../agents/marketing.js';
import { AutomationAgent } from '../agents/automation.js';
import { StrategyAgent } from '../agents/strategy.js';
import { BaseAgent } from '../agents/base.js';
import { logger } from './logger.js';
import {
  DEFAULT_AUDIT_PRODUCT_MODE,
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  PHASE_DOMAIN_MAP,
  type AuditExecutionPlan,
  type DomainKey,
  type DomainResult,
  type FreeSnapshotPreview,
  type ProductMode,
  reviewPhasesForExecutionPlan,
} from '../types/audit.js';
import { pipelineStatusForPhase } from '../config/pipeline-status.js';
import { recordAgentPerformance } from './agent-performance.js';
import { PIPELINE_EVENT_ERROR_CODES } from '../config/pipeline-event-error-codes.js';
import {
  PIPELINE_EVENT_TYPES,
} from '../config/pipeline-event-types.js';
import type { ControlObjectV1 } from '../schemas/control-object.js';
import { fetchPriorControlObjectsForPhase } from './control-object-history.js';
import { banditService, DEFAULT_VARIANT_ID } from './bandit.js';
import { normalizeExecutionPlan } from './execution-plan.js';
import {
  ANALYTIC_WING_PHASES,
  AUTO_WING_PHASES,
  PIPELINE_PHASE_RUN_ATTEMPT_INITIAL,
} from '../config/pipeline-orchestrator-constants.js';
import { writePipelineEventAndPhaseRun } from './pipeline/events/eventWriter.js';
import { maybePublishPipelineNotification } from './pipeline/events/notificationPublisher.js';
import {
  runPhaseDomainExecution,
} from './pipeline/phaseRunner.js';
import { publishControlObjectGovernanceCore } from './pipeline/governance/controlObjectGovernance.js';
import { attemptAutoLoop as attemptAutoLoopService, estimateRerunCostUsd as estimateRerunCostUsdService } from './pipeline/autoLoop/autoLoopService.js';
import {
  runAutoWingQualityGateAndMaybeReviewGate,
  runStrategyQualityGate,
} from './pipeline/reviewGateCoordinator.js';
import { runFreeSnapshotService } from './pipeline/freeSnapshotService.js';
import { recoverStalledPipelines as recoverStalledPipelinesService } from './pipeline/recovery/recoverStalledPipelines.js';

type AgentConstructor = new (auditId: string) => BaseAgent;

const PHASE_AGENTS: Record<number, AgentConstructor> = {
  0: ReconAgent,
  1: TechAgent,
  2: SecurityAgent,
  3: SeoAgent,
  4: UxAgent,
  5: MarketingAgent,
  6: AutomationAgent,
  7: StrategyAgent,
};

/**
 * Phases that run concurrently within a block.
 *
 * Auto wing   (1–4): Tech, Security, SEO, UX — all data-independent, safe to parallelise.
 * Analytic wing (5–6): Marketing, Automation — also independent of each other.
 * Phase 7 (Strategy) remains sequential; it synthesises every prior result.
 */
const STALLED_PHASE_TIMEOUT_MIN = SYSTEM_DEFAULTS.pipelineOrchestrator.stalledPhaseTimeoutMin;
const PARALLEL_FAILURE_THRESHOLD = SYSTEM_DEFAULTS.pipelineOrchestrator.parallelFailureThreshold;

class PipelineCancelledError extends Error {
  constructor() {
    super('Pipeline cancelled');
    this.name = 'PipelineCancelledError';
  }
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
    const { data: audit } = await supabase.from('audits').select('status').eq('id', this.auditId).single();
    if (audit?.status === 'cancelled') {
      return false;
    }
    const { error } = await supabase
      .from('audits')
      .update(patch)
      .eq('id', this.auditId);
    return !error;
  }

  private async assertNotCancelled(): Promise<void> {
    const { data } = await supabase.from('audits').select('status').eq('id', this.auditId).single();
    if (data?.status === 'cancelled') {
      throw new PipelineCancelledError();
    }
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
    }
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

      // Phase 5: attempt auto-loop if enabled for this environment
      if (await this.shouldAttemptAutoLoop()) {
        const looped = await attemptAutoLoopService({
          auditId: this.auditId,
          phase,
          originalControlObject: controlObject,
          activeErrorTypes: decision.active_error_types,
          disableAutoRemediate: this.disableAutoRemediate,
          agentClassForPhase: (p) => PHASE_AGENTS[p],
          attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
          recordBanditArmAsync: this.recordBanditArmAsync.bind(this),
          emitEvent: this.emitEvent.bind(this),
        });
        if (looped) return; // auto-loop handled the refine — no manual escalation needed
      }

      // Fallback: emit refine_recommended for manual consultant review
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

  /** Updates bandit arm stats from the completed run (FEATURE_BANDITS only). Fire-and-forget. */
  private recordBanditArmAsync(controlObject: ControlObjectV1): void {
    if (!isBanditsEnabled()) return;
    const pid = controlObject.context.phase_id;
    if (pid === 'recon' || pid === 'strategy') return;
    const metrics = controlObject.agent_performance;
    if (!metrics) return;
    const variantId = controlObject.context.selected_variant_id ?? DEFAULT_VARIANT_ID;
    void banditService.recordArmResult(pid as DomainKey, variantId, metrics.agent_score);
  }

  /** Best-effort async agent performance recording — never throws. */
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

  /** Returns true only when auto-loop is enabled and the deployment profile is allowed. */
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

  /**
   * Estimates rerun cost from the latest token_usage event for this phase.
   * Falls back to a conservative model-based estimate when historical usage is unavailable.
   */
  private async estimateRerunCostUsd(phase: number): Promise<number> {
    return estimateRerunCostUsdService({ auditId: this.auditId, phase });
  }

  /**
   * Attempt auto-loop rerun for a phase that received a 'refine' decision.
   *
   * - Generates instruction patches from DynamicAdjustmentService
   * - Reruns only the single affected agent (not entire pipeline)
   * - Enforces MAX_ITERATIONS cap
   * - Stops if confidence gain < MIN_CONFIDENCE_GAIN
   * - Stops if estimated cost exceeds guardrail
   *
   * Returns true if auto-loop ran (regardless of outcome), false if skipped.
   */
  private async attemptAutoLoop(
    phase: number,
    originalControlObject: ControlObjectV1,
    activeErrorTypes: string[]
  ): Promise<boolean> {
    return attemptAutoLoopService({
      auditId: this.auditId,
      phase,
      originalControlObject,
      activeErrorTypes,
      disableAutoRemediate: this.disableAutoRemediate,
      agentClassForPhase: (p) => PHASE_AGENTS[p],
      attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
      recordBanditArmAsync: this.recordBanditArmAsync.bind(this),
      emitEvent: this.emitEvent.bind(this),
    });
  }

  /** Fetch normalized execution plan for this audit with legacy fallback. */
  private async getExecutionPlan(): Promise<AuditExecutionPlan> {
    const { data } = await supabase
      .from('audits')
      .select('execution_plan, product_mode')
      .eq('id', this.auditId)
      .single();
    return normalizeExecutionPlan(
      (data?.execution_plan as Partial<AuditExecutionPlan> | null | undefined) ?? null,
      (data?.product_mode as ProductMode | undefined) ?? DEFAULT_AUDIT_PRODUCT_MODE,
    );
  }

  /**
   * Start a specific phase (sequential, single-phase path).
   * Handles audit-level status updates, review gates, and full error propagation.
   * Used for Phase 0 (Recon), Phase 7 (Strategy), and direct retry calls.
   */
  async startPhase(phase: number): Promise<void> {
    const AgentClass = PHASE_AGENTS[phase];
    if (!AgentClass) {
      throw new Error(`Unknown phase: ${phase}`);
    }

    try {
      await this.assertNotCancelled();
      const executionPlan = await this.getExecutionPlan();
      const availablePhases = executionPlanToPhases(executionPlan);
      const maxPhase = maxPhaseForExecutionPlan(executionPlan);
      if (!availablePhases.includes(phase)) {
        throw new Error(`Phase ${phase} is not available for execution plan (max: ${maxPhase})`);
      }

      // Brief gate — Phase 0 is blocked for express/full until SLA questions are answered
      if (phase === 0) {
        await assertBriefReady(this.auditId);
      }

      // Emit start event
      const ocStart = pipelineOrchestratorCopy();
      await this.emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.started,
        interpolateOrchestratorMessage(ocStart.phase.startedTemplate, {
          phase,
          domain: PHASE_DOMAIN_MAP[phase],
        }),
      );

      // Update audit status + current_phase
      const moved = await this.updateAuditIfNotCancelled({
        status: pipelineStatusForPhase(phase),
        current_phase: phase,
      });
      if (!moved) throw new PipelineCancelledError();

      const domainKey = PHASE_DOMAIN_MAP[phase];
      const result = await runPhaseDomainExecution({
        auditId: this.auditId,
        phase,
        domainKey,
        AgentClass,
        attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
        publishControlObjectGovernance: this.publishControlObjectGovernance.bind(this),
      });

      // Check if this phase triggers a review point
      const reviewPhases = reviewPhasesForExecutionPlan(executionPlan);
      if ((reviewPhases as readonly number[]).includes(phase)) {
        await this.emitEvent(phase, PIPELINE_EVENT_TYPES.reviewNeeded, ocStart.phase.reviewNeeded);
        const reviewSet = await this.updateAuditIfNotCancelled({ status: 'review' });
        if (!reviewSet) throw new PipelineCancelledError();
      }

      await this.emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.completed,
        interpolateOrchestratorMessage(ocStart.phase.completedTemplate, { phase }),
        {
          score: result.score > 0 ? result.score : undefined,
        },
      );

    } catch (err) {
      const error = err as Error;
      if (error instanceof PipelineCancelledError) {
        logger.info('Pipeline phase cancelled', { audit_id: this.auditId, phase });
        return;
      }
      logger.error('Pipeline phase failed', {
        audit_id: this.auditId,
        phase,
        error: error.message,
        stack: error.stack,
      });

      const domainKey = PHASE_DOMAIN_MAP[phase];
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'failed' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      await this.updateAuditIfNotCancelled({ status: 'failed' });
      const ocErr = pipelineOrchestratorCopy();
      await this.emitEvent(phase, PIPELINE_EVENT_TYPES.error, ocErr.errors.phaseFailedUserMessage, {
        error_code: ocErr.errors.phaseFailedCode,
        phase,
        domain_key: domainKey !== 'recon' && domainKey !== 'strategy' ? domainKey : undefined,
      });

      throw err;
    }
  }

  /**
   * Run a single phase in isolation — used inside a parallel block.
   *
   * Differences from `startPhase()`:
   * - Does NOT update `audits.status` or `audits.current_phase` (block-level concern).
   * - Does NOT emit `review_needed` (block-level concern after all phases finish).
   * - On error: marks only the individual domain as 'failed'; does NOT abort the audit.
   *   Throws so Promise.allSettled() can track the failure.
   */
  private async startPhaseIsolated(phase: number): Promise<void> {
    const AgentClass = PHASE_AGENTS[phase];
    if (!AgentClass) throw new Error(`Unknown phase: ${phase}`);

    const domainKey = PHASE_DOMAIN_MAP[phase];

    try {
      await this.assertNotCancelled();
      const ocIso = pipelineOrchestratorCopy();
      await this.emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.started,
        interpolateOrchestratorMessage(ocIso.phase.startedTemplate, { phase, domain: domainKey }),
      );

      const result = await runPhaseDomainExecution({
        auditId: this.auditId,
        phase,
        domainKey,
        AgentClass,
        attachPriorControlObjects: this.attachPriorControlObjects.bind(this),
        publishControlObjectGovernance: this.publishControlObjectGovernance.bind(this),
      });

      await this.emitEvent(
        phase,
        PIPELINE_EVENT_TYPES.completed,
        interpolateOrchestratorMessage(ocIso.phase.completedTemplate, { phase }),
        {
          score: result.score > 0 ? result.score : undefined,
        },
      );

    } catch (err) {
      const error = err as Error;
      if (error instanceof PipelineCancelledError) {
        logger.info('Pipeline isolated phase cancelled', { audit_id: this.auditId, phase });
        throw err;
      }
      logger.error('Pipeline parallel phase failed', {
        audit_id: this.auditId,
        phase,
        error: error.message,
        stack: error.stack,
      });

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'failed' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      const ocParErr = pipelineOrchestratorCopy();
      await this.emitEvent(phase, PIPELINE_EVENT_TYPES.error, ocParErr.errors.parallelPhaseFailedUserMessage, {
        error_code: ocParErr.errors.parallelPhaseFailedCode,
        phase,
        domain_key: domainKey !== 'recon' && domainKey !== 'strategy' ? domainKey : undefined,
      });
      throw err;
    }
  }

  /**
   * Run multiple phases concurrently using Promise.allSettled().
   *
   * Partial-failure semantics:
   * - If some (but not all) phases fail → continue; failed domains are recorded and
   *   later surfaced to the Strategy Agent via context-builder.
   * - If ALL phases fail → audit is marked 'failed' and an error is thrown.
   *
   * Caller is responsible for updating `audits.status` and `current_phase` before
   * and after this call.
   *
   * @returns Array of domain key strings for phases that failed (empty = all succeeded).
   */
  private async runParallelBlock(phases: readonly number[]): Promise<string[]> {
    const ocPar = pipelineOrchestratorCopy();
    await this.emitEvent(
      -1,
      PIPELINE_EVENT_TYPES.parallelStarted,
      interpolateOrchestratorMessage(ocPar.parallel.startedTemplate, { phases: phases.join(',') }),
    );

    const results = await Promise.allSettled(
      phases.map(p => this.startPhaseIsolated(p)),
    );

    const failedDomains: string[] = [];
    const cancelledErrors: Error[] = [];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const reason = result.reason as Error;
        if (reason instanceof PipelineCancelledError) {
          cancelledErrors.push(reason);
          return;
        }
        failedDomains.push(String(PHASE_DOMAIN_MAP[phases[i]]));
      }
    });

    if (cancelledErrors.length > 0) {
      throw cancelledErrors[0];
    }

    if (failedDomains.length === phases.length) {
      // Total failure — mark audit failed
      await this.updateAuditIfNotCancelled({ status: 'failed' });
      const joined = failedDomains.join(', ');
      await this.emitEvent(
        -1,
        PIPELINE_EVENT_TYPES.error,
        interpolateOrchestratorMessage(ocPar.parallel.allFailedTemplate, { domains: joined }),
        { error_code: PIPELINE_EVENT_ERROR_CODES.ALL_PARALLEL_PHASES_FAILED, domains_unavailable: failedDomains },
      );
      throw new Error(`All parallel phases failed: ${joined}`);
    }

    if (failedDomains.length >= PARALLEL_FAILURE_THRESHOLD) {
      await this.updateAuditIfNotCancelled({ status: 'failed' });
      const joined = failedDomains.join(', ');
      await this.emitEvent(
        -1,
        PIPELINE_EVENT_TYPES.error,
        interpolateOrchestratorMessage(ocPar.parallel.thresholdFailedTemplate, {
          failed: failedDomains.length,
          total: phases.length,
          domains: joined,
        }),
        { domains_unavailable: failedDomains, threshold: PARALLEL_FAILURE_THRESHOLD },
      );
      throw new Error(`Parallel block failure threshold exceeded: ${joined}`);
    }

    if (failedDomains.length > 0) {
      await this.emitEvent(
        -1,
        PIPELINE_EVENT_TYPES.partialFailure,
        interpolateOrchestratorMessage(ocPar.parallel.partialFailureTemplate, {
          count: failedDomains.length,
          domains: failedDomains.join(', '),
        }),
        { domains_unavailable: failedDomains },
      );
    } else {
      await this.emitEvent(
        -1,
        PIPELINE_EVENT_TYPES.parallelCompleted,
        interpolateOrchestratorMessage(ocPar.parallel.completedTemplate, { phases: phases.join(',') }),
      );
    }

    return failedDomains;
  }

  /**
   * Run the next block of phases from the current pipeline position.
   *
   * Called by POST /api/audits/:id/pipeline/next (and after review approvals).
   * Detects which wing is next (auto / analytic / strategy) and runs accordingly.
   *
   * Wing layout (full mode):
   *   current_phase=0  → auto wing: phases 1-4 in parallel
   *   current_phase=4  → analytic wing: phases 5-6 in parallel, then phase 7 sequential
   *   current_phase=7  → nothing (all done)
   *
   * Express mode: only auto wing (phases 1-4); no analytic or strategy.
   */
  async runBlock(): Promise<void> {
    try {
      const { data: audit, error: auditErr } = await supabase
        .from('audits')
        .select('current_phase, status')
        .eq('id', this.auditId)
        .single();

      if (auditErr || !audit) {
        logger.error('Run block failed to load audit', { audit_id: this.auditId, error: auditErr?.message ?? 'missing' });
        throw new Error('Audit not found while running block');
      }

      const executionPlan = await this.getExecutionPlan();
      const executablePhases = executionPlanToPhases(executionPlan).filter((p) => p > 0);
      const maxPhase = maxPhaseForExecutionPlan(executionPlan);
      const reviewPhases = reviewPhasesForExecutionPlan(executionPlan);
      const nextPhase = executablePhases.find((p) => p > audit.current_phase);

      if (audit.status === 'cancelled') return;
      if (!nextPhase || nextPhase > maxPhase) return; // All phases complete

      // ── Auto wing: phases 1-4 (or subset for express) ────────────────
      if ((AUTO_WING_PHASES as readonly number[]).includes(nextPhase)) {
        const wingPhases = AUTO_WING_PHASES.filter((p) => p <= maxPhase && executablePhases.includes(p));
        const lastWingPhase = wingPhases.length > 0 ? Math.max(...wingPhases) : nextPhase;

      const movedToAuto = await this.updateAuditIfNotCancelled({ status: 'auto', current_phase: nextPhase });
      if (!movedToAuto) throw new PipelineCancelledError();

      await this.runParallelBlock(wingPhases);

      // Record last completed wing phase
      const advancedAuto = await this.updateAuditIfNotCancelled({ current_phase: lastWingPhase });
      if (!advancedAuto) throw new PipelineCancelledError();

      await runAutoWingQualityGateAndMaybeReviewGate({
        auditId: this.auditId,
        afterPhase: lastWingPhase,
        phasesInWing: wingPhases,
        reviewPhases,
        emitEvent: this.emitEvent.bind(this),
        updateAuditIfNotCancelled: this.updateAuditIfNotCancelled.bind(this),
        cancelledErrorFactory: () => new PipelineCancelledError(),
      });
        return;
      }

    // ── Analytic wing: phases 5-6, then Strategy ─────────────────────
      if ((ANALYTIC_WING_PHASES as readonly number[]).includes(nextPhase)) {
      const wingPhases = ANALYTIC_WING_PHASES.filter((p) => p <= maxPhase && executablePhases.includes(p));
      const lastWingPhase = wingPhases.length > 0 ? Math.max(...wingPhases) : nextPhase;

      const movedToAnalytic = await this.updateAuditIfNotCancelled({ status: 'analytic', current_phase: nextPhase });
      if (!movedToAnalytic) throw new PipelineCancelledError();

      await this.runParallelBlock(wingPhases);

      const advancedAnalytic = await this.updateAuditIfNotCancelled({ current_phase: lastWingPhase });
      if (!advancedAnalytic) throw new PipelineCancelledError();

      // Continue to Strategy (phase 7) without an intermediate gate
      if (executionPlanToPhases(executionPlan).includes(7)) {
        await this.startPhase(7);

        // Run quality gate on the full audit (all domains) after strategy completes
        const allDomainPhases = [...wingPhases, 7];
        await runStrategyQualityGate({
          auditId: this.auditId,
          afterPhase: 7,
          phasesToCheck: allDomainPhases,
        });
      }
        return;
      }

    // ── Strategy phase (solo) ─────────────────────────────────────────
      if (nextPhase === 7) {
        await this.startPhase(7);
        return;
      }
    } catch (err) {
      if (err instanceof PipelineCancelledError) {
        logger.info('Pipeline block cancelled', { audit_id: this.auditId });
        return;
      }
      throw err;
    }
  }

  /**
   * Free Snapshot — deterministic scanner (no LLM): tiered fetch, site profile, rule engine.
   * Persists audit_recon + ux_conversion row; trimmed to 2 issues + 2 quick wins in API.
   */
  async runFreeSnapshot(): Promise<FreeSnapshotPreview> {
    return runFreeSnapshotService({
      auditId: this.auditId,
      emitEvent: this.emitEvent.bind(this),
    });
  }

  /**
   * Writes `pipeline_events` and mirrors lifecycle into in-app notifications.
   * Copy is sourced from `pipeline-orchestrator-copy.v1.json` (orchestrator) and agent JSON, not ad hoc strings.
   */
  private async emitEvent(phase: number, eventType: string, message: string, data: Record<string, unknown> = {}): Promise<void> {
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

/**
 * Mark long-running active audits as stalled/failed so users can retry.
 * This is a minimal recovery guard until durable queue orchestration is introduced.
 */
export async function recoverStalledPipelines(timeoutMinutes = STALLED_PHASE_TIMEOUT_MIN): Promise<number> {
  return recoverStalledPipelinesService(timeoutMinutes);
}
