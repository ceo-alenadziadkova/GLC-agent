import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../config/pipeline-orchestrator-copy.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  getAutoLoopAllowedModes,
  isAutoLoopEnabled,
  isBanditsEnabled,
  isCausalDagEnabled,
} from '../config/feature-flags.js';
import { applyAutoRemediation } from './remediation.js';
import { supabase } from './supabase.js';
import { assertBriefReady } from './brief-validator.js';
import { consistencyChecker } from './consistency-checker.js';
import { ReconAgent } from '../agents/recon.js';
import { TechAgent } from '../agents/tech.js';
import { SecurityAgent } from '../agents/security.js';
import { SeoAgent } from '../agents/seo.js';
import { UxAgent } from '../agents/ux.js';
import { runDeterministicSnapshot } from '../snapshot/run-snapshot.js';
import { SnapshotAtCapacityError } from '../snapshot/abuse-guards.js';
import { MarketingAgent } from '../agents/marketing.js';
import { AutomationAgent } from '../agents/automation.js';
import { StrategyAgent } from '../agents/strategy.js';
import { BaseAgent } from '../agents/base.js';
import { logger } from './logger.js';
import { getContext, updateContext } from './observability-context.js';
import { emitStructuredNotification } from './notifications.js';
import { decisionLayer } from './decision-layer.js';
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
} from '../types/audit.js';
import { recordEvaluationDatasetIfEnabled } from './evaluation-dataset-writer.js';
import { dynamicAdjustmentService } from './dynamic-adjustment.js';
import { recordAgentPerformance } from './agent-performance.js';
import { PIPELINE_EVENT_ERROR_CODES } from '../config/pipeline-event-error-codes.js';
import type { ControlObjectV1, PhaseId } from '../schemas/control-object.js';
import { fetchPriorControlObjectsForPhase } from './control-object-history.js';
import { invalidateDownstreamDependents } from './audit-claim-graph.js';
import { banditService, DEFAULT_VARIANT_ID } from './bandit.js';
import { attachBenchmarkReferenceToControlObject } from './benchmark-snapshot.js';
import { findVariant } from '../config/agent-variants.js';
import { CLAUDE_MODEL, MODEL_MAX_TOKENS, getModelPricing } from '../config/model.js';
import { roundTokenCostUsd } from '../config/token-cost-rounding.js';
import { normalizeExecutionPlan } from './execution-plan.js';

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
const AUTO_WING_PHASES    = [1, 2, 3, 4] as const;
const ANALYTIC_WING_PHASES = [5, 6] as const;
const STALLED_PHASE_TIMEOUT_MIN = SYSTEM_DEFAULTS.pipelineOrchestrator.stalledPhaseTimeoutMin;
const STALLED_PHASE_ACTIVE_STATUSES = ['recon', 'auto', 'analytic', 'strategy'] as const;
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
    let decision;
    try {
      decision = decisionLayer.decide(controlObject);
      controlObject.decision_hint = decision.hint;
    } catch (dlErr) {
      logger.warn('pipeline.decision_layer_failed', {
        component: 'pipeline',
        audit_id: this.auditId,
        phase,
        error: dlErr instanceof Error ? dlErr.message : String(dlErr),
      });
    }

    if (isCausalDagEnabled() && controlObject.errors.structural.length > 0) {
      const pid = controlObject.context.phase_id;
      if (pid !== 'recon' && pid !== 'strategy') {
        const seeds = controlObject.context.structural_invalidation_claim_ids;
        if (seeds && seeds.length > 0) {
          const refs = seeds.map(claimId => ({ phase_id: pid as PhaseId, claim_id: claimId }));
          const { marked } = await invalidateDownstreamDependents(this.auditId, refs);
          if (marked.length > 0) {
            await this.emitEvent(
              phase,
              'log',
              `Causal DAG: marked ${marked.length} downstream claim(s) invalidated after upstream structural issues.`,
              { invalidated_downstream: marked, source_phase_id: pid },
            );
          }
        }
      }
    }

    if (evaluationCapture) {
      const remediated = await applyAutoRemediation({
        auditId: this.auditId,
        controlObject,
        cleanedOutput: evaluationCapture.cleanedOutput,
        phaseNumber: phase,
        disableAutoRemediate: this.disableAutoRemediate,
      });
      if (remediated > 0) {
        try {
          const postRem = decisionLayer.decide(controlObject);
          controlObject.decision_hint = postRem.hint;
        } catch (reDecideErr) {
          logger.warn('pipeline.remediation_redecide_failed', {
            component: 'pipeline',
            audit_id: this.auditId,
            phase,
            error: reDecideErr instanceof Error ? reDecideErr.message : String(reDecideErr),
          });
        }
        await this.emitEvent(
          phase,
          'log',
          `Auto-remediation: corrected ${remediated} issue(s).`,
          { auto_remediation_count: remediated },
        );
      }
    }

    await attachBenchmarkReferenceToControlObject(this.auditId, controlObject);

    if (evaluationCapture) {
      await recordEvaluationDatasetIfEnabled({
        auditId: this.auditId,
        phaseId: evaluationCapture.phaseId,
        controlObject,
        rawAgentOutput: evaluationCapture.rawAgentOutput,
        cleanedOutput: evaluationCapture.cleanedOutput,
      });
    }

    // v2.0: persist agent performance metrics (async, best-effort)
    void this.recordPerformanceAsync(controlObject, phase);
    void this.recordBanditArmAsync(controlObject);

    try {
      await this.emitEvent(phase, 'control_object', '', { control_object: controlObject });
    } catch (emitErr) {
      logger.warn('pipeline.control_object_emit_failed', {
        component: 'pipeline',
        audit_id: this.auditId,
        phase,
        error: emitErr instanceof Error ? emitErr.message : String(emitErr),
      });
    }

    if (decision?.hint === 'refine') {
      const oc = pipelineOrchestratorCopy();

      // Phase 5: attempt auto-loop if enabled for this environment
      if (await this.shouldAttemptAutoLoop()) {
        const looped = await this.attemptAutoLoop(phase, controlObject, decision.active_error_types);
        if (looped) return; // auto-loop handled the refine — no manual escalation needed
      }

      // Fallback: emit refine_recommended for manual consultant review
      await this.emitEvent(
        phase,
        'refine_recommended',
        oc.phase.refineRecommendedMessage ?? 'Decision Layer recommends manual review before proceeding.',
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

  /** Returns true only when auto-loop is enabled and the current environment is allowed. */
  private async shouldAttemptAutoLoop(): Promise<boolean> {
    if (!isAutoLoopEnabled()) return false;

    // Check execution environment against allowedModes
    const env = process.env.NODE_ENV?.trim();
    if (!env) {
      logger.warn('pipeline.auto_loop_skipped_missing_env', {
        component: 'pipeline',
        audit_id: this.auditId,
        env,
      });
      return false;
    }
    const allowedModes = getAutoLoopAllowedModes();
    if (!allowedModes.includes(env)) {
      logger.info('pipeline.auto_loop_skipped_env', {
        component: 'pipeline',
        audit_id: this.auditId,
        env,
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
    const { data: tokenUsageEvent } = await supabase
      .from('pipeline_events')
      .select('data')
      .eq('audit_id', this.auditId)
      .eq('phase', phase)
      .eq('event_type', 'token_usage')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const eventCost = (tokenUsageEvent?.data as { cost_usd?: unknown } | null)?.cost_usd;
    if (typeof eventCost === 'number' && Number.isFinite(eventCost) && eventCost > 0) {
      return roundTokenCostUsd(eventCost);
    }

    const pricing = getModelPricing(CLAUDE_MODEL);
    const conservativeFallback =
      (MODEL_MAX_TOKENS.domain / 1_000_000) * pricing.input +
      (MODEL_MAX_TOKENS.domain / 1_000_000) * pricing.output;
    return roundTokenCostUsd(conservativeFallback);
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
    const cfg = SYSTEM_DEFAULTS.autoLoop;
    const AgentClass = PHASE_AGENTS[phase];
    if (!AgentClass) return false;

    const domainKey = PHASE_DOMAIN_MAP[phase];
    if (domainKey === 'recon' || domainKey === 'strategy') return false;

    const originalConfidence = originalControlObject.confidence.overall;

    // Generate instruction patches
    const { adjustments, matched_error_types } = dynamicAdjustmentService.generateAdjustments(originalControlObject);

    if (adjustments.size === 0) {
      logger.info('pipeline.auto_loop_no_adjustments', {
        component: 'pipeline',
        audit_id: this.auditId,
        phase,
        active_error_types: activeErrorTypes,
      });
      return false;
    }

    logger.info('pipeline.auto_loop_start', {
      component: 'pipeline',
      audit_id: this.auditId,
      phase,
      domain: domainKey,
      matched_error_types,
      agent_count: adjustments.size,
    });

    let currentControlObject = originalControlObject;

    for (let iteration = 1; iteration <= cfg.maxIterations; iteration++) {
      // Cost guardrail: estimate and check before rerun
      const estimatedRerunCostUsd = await this.estimateRerunCostUsd(phase);
      const rerunCostSoFar = (currentControlObject.cost_control?.total_rerun_cost_usd ?? 0);
      const projectedTotal = rerunCostSoFar + estimatedRerunCostUsd;

      if (
        projectedTotal > cfg.costGuardrailThresholdUsd &&
        (currentControlObject.confidence.overall - originalConfidence) < cfg.minConfidenceGain
      ) {
        logger.info('pipeline.auto_loop_cost_guardrail', {
          component: 'pipeline',
          audit_id: this.auditId,
          phase,
          iteration,
          projected_cost_usd: projectedTotal,
          confidence_gain: currentControlObject.confidence.overall - originalConfidence,
        });
        // Update cost_control to record the block
        if (currentControlObject.cost_control) {
          currentControlObject.cost_control.cost_guardrail_triggered = true;
        }
        break;
      }

      // Rerun the agent with adjustment patches
      try {
        const oc = pipelineOrchestratorCopy();
        await this.emitEvent(
          phase,
          'log',
          `Auto-loop iteration ${iteration}/${cfg.maxIterations} — applying ${matched_error_types.length} correction(s).`,
        );

        const agent = new AgentClass(this.auditId);
        // Inject bandit variant for the auto-loop rerun (same bandit selection as initial run)
        {
          const banditResult = await banditService.selectVariant(domainKey as DomainKey);
          agent.selectedVariantId = banditResult.variant_id;
          if (banditResult.variant_id !== DEFAULT_VARIANT_ID) {
            const variant = findVariant(domainKey as DomainKey, banditResult.variant_id);
            if (variant) agent.variantDelta = variant;
          }
        }
        await this.attachPriorControlObjects(agent, domainKey as DomainKey);
        // Inject instruction patches via agent property (BaseAgent reads this in buildInstructions)
        if ('autoLoopAdjustments' in agent) {
          (agent as BaseAgent & { autoLoopAdjustments?: Map<number, string> }).autoLoopAdjustments = adjustments;
        }

        const rerunResult = await agent.run();
        const rerunControlObject = (agent as BaseAgent).lastControlObject;

        if (!rerunControlObject) break;

        // Populate cost_control for the rerun
        rerunControlObject.cost_control = {
          estimated_cost_usd: estimatedRerunCostUsd,
          total_rerun_cost_usd: projectedTotal,
          rerun_count: iteration,
          cost_guardrail_triggered: false,
        };

        // Re-run Decision Layer on the new output
        const rerunDecision = decisionLayer.decide(rerunControlObject);
        rerunControlObject.decision_hint = rerunDecision.hint;

        const remediated = await applyAutoRemediation({
          auditId: this.auditId,
          controlObject: rerunControlObject,
          cleanedOutput: rerunResult,
          phaseNumber: phase,
          disableAutoRemediate: this.disableAutoRemediate,
        });
        if (remediated > 0) {
          try {
            const postRem = decisionLayer.decide(rerunControlObject);
            rerunControlObject.decision_hint = postRem.hint;
          } catch (reDecideErr) {
            logger.warn('pipeline.remediation_redecide_failed', {
              component: 'pipeline',
              audit_id: this.auditId,
              phase,
              error: reDecideErr instanceof Error ? reDecideErr.message : String(reDecideErr),
            });
          }
          await this.emitEvent(
            phase,
            'log',
            `Auto-remediation: corrected ${remediated} issue(s).`,
            { auto_remediation_count: remediated },
          );
        }

        await attachBenchmarkReferenceToControlObject(this.auditId, rerunControlObject);

        // Record evaluation dataset for the rerun
        await recordEvaluationDatasetIfEnabled({
          auditId: this.auditId,
          phaseId: domainKey as DomainKey,
          controlObject: rerunControlObject,
          rawAgentOutput: (agent as BaseAgent).lastRawDomainResult,
          cleanedOutput: rerunResult,
        });

        void this.recordBanditArmAsync(rerunControlObject);

        await this.emitEvent(phase, 'control_object', '', { control_object: rerunControlObject });

        const confidenceGain = rerunControlObject.confidence.overall - originalConfidence;

        logger.info('pipeline.auto_loop_iteration_result', {
          component: 'pipeline',
          audit_id: this.auditId,
          phase,
          iteration,
          original_confidence: originalConfidence,
          new_confidence: rerunControlObject.confidence.overall,
          confidence_gain: confidenceGain,
          new_decision: rerunDecision.hint,
        });

        currentControlObject = rerunControlObject;

        // Accept if decision improved or minimum gain achieved
        if (rerunDecision.hint !== 'refine') {
          await agent.saveDomainResult(rerunResult);
          await this.emitEvent(
            phase,
            'log',
            `Auto-loop: ${rerunDecision.hint} after ${iteration} iteration(s). Confidence +${confidenceGain} pts.`,
          );
          return true;
        }

        // Stop if gain below minimum — further reruns unlikely to help
        if (confidenceGain < cfg.minConfidenceGain) {
          logger.info('pipeline.auto_loop_insufficient_gain', {
            component: 'pipeline',
            audit_id: this.auditId,
            phase,
            iteration,
            confidence_gain: confidenceGain,
            min_required: cfg.minConfidenceGain,
          });
          break;
        }

      } catch (loopErr) {
        logger.warn('pipeline.auto_loop_iteration_failed', {
          component: 'pipeline',
          audit_id: this.auditId,
          phase,
          iteration,
          error: loopErr instanceof Error ? loopErr.message : String(loopErr),
        });
        break;
      }
    }

    // Auto-loop exhausted without reaching accept — emit refine_recommended
    const oc = pipelineOrchestratorCopy();
    await this.emitEvent(
      phase,
      'refine_recommended',
      oc.phase.refineRecommendedMessage,
      {
        decision_hint: 'refine',
        reasoning: `Auto-loop ran ${cfg.maxIterations} iteration(s) without reaching accept threshold.`,
        active_error_types: activeErrorTypes,
        control_object: currentControlObject,
      },
    );

    return true; // we handled the refine path (via auto-loop + final emission)
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
        'started',
        interpolateOrchestratorMessage(ocStart.phase.startedTemplate, {
          phase,
          domain: PHASE_DOMAIN_MAP[phase],
        }),
      );

      // Update audit status + current_phase
      const statusMap: Record<number, string> = {
        0: 'recon',
        1: 'auto', 2: 'auto', 3: 'auto', 4: 'auto',
        5: 'analytic', 6: 'analytic',
        7: 'strategy',
      };
      const moved = await this.updateAuditIfNotCancelled({
        status: statusMap[phase] ?? 'auto',
        current_phase: phase,
      });
      if (!moved) throw new PipelineCancelledError();

      // Update domain status to 'collecting' (if applicable)
      const domainKey = PHASE_DOMAIN_MAP[phase];
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'collecting' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      // Run the agent
      const agent = new AgentClass(this.auditId);
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        const banditResult = await banditService.selectVariant(domainKey as DomainKey);
        agent.selectedVariantId = banditResult.variant_id;
        if (banditResult.variant_id !== DEFAULT_VARIANT_ID) {
          const variant = findVariant(domainKey as DomainKey, banditResult.variant_id);
          if (variant) agent.variantDelta = variant;
        }
        await this.attachPriorControlObjects(agent, domainKey as DomainKey);
      }
      const result = await agent.run();

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        // ─── Decision Layer (Phase 1: advisory / log only) ──────
        // In Phase 1, refine hint does NOT block or auto-rerun.
        // It emits an event for consultant awareness.
        // Phase 5 activates auto-loop via AUTO_LOOP_ENABLED flag.
        const controlObject = (agent as BaseAgent).lastControlObject;
        if (controlObject) {
          await this.publishControlObjectGovernance(phase, controlObject, {
            phaseId: domainKey as DomainKey,
            rawAgentOutput: (agent as BaseAgent).lastRawDomainResult,
            cleanedOutput: result,
          });
        }

        await agent.saveDomainResult(result);
      }

      // Check if this phase triggers a review point
      if ((executionPlanToPhases(executionPlan) as readonly number[]).includes(phase) && [0, 4, 7].includes(phase)) {
        await this.emitEvent(phase, 'review_needed', ocStart.phase.reviewNeeded);
        const reviewSet = await this.updateAuditIfNotCancelled({ status: 'review' });
        if (!reviewSet) throw new PipelineCancelledError();
      }

      await this.emitEvent(
        phase,
        'completed',
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
      await this.emitEvent(phase, 'error', ocErr.errors.phaseFailedUserMessage, {
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
        'started',
        interpolateOrchestratorMessage(ocIso.phase.startedTemplate, { phase, domain: domainKey }),
      );

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'collecting' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      const agent = new AgentClass(this.auditId);
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        const banditResult = await banditService.selectVariant(domainKey as DomainKey);
        agent.selectedVariantId = banditResult.variant_id;
        if (banditResult.variant_id !== DEFAULT_VARIANT_ID) {
          const variant = findVariant(domainKey as DomainKey, banditResult.variant_id);
          if (variant) agent.variantDelta = variant;
        }
        await this.attachPriorControlObjects(agent, domainKey as DomainKey);
      }
      const result = await agent.run();

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        // ─── Decision Layer (isolated path — same advisory logic) ──
        const controlObject = (agent as BaseAgent).lastControlObject;
        if (controlObject) {
          await this.publishControlObjectGovernance(phase, controlObject, {
            phaseId: domainKey as DomainKey,
            rawAgentOutput: (agent as BaseAgent).lastRawDomainResult,
            cleanedOutput: result,
          });
        }

        await agent.saveDomainResult(result);
      }

      await this.emitEvent(
        phase,
        'completed',
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
      await this.emitEvent(phase, 'error', ocParErr.errors.parallelPhaseFailedUserMessage, {
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
      'parallel_started',
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
        'error',
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
        'error',
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
        'partial_failure',
        interpolateOrchestratorMessage(ocPar.parallel.partialFailureTemplate, {
          count: failedDomains.length,
          domains: failedDomains.join(', '),
        }),
        { domains_unavailable: failedDomains },
      );
    } else {
      await this.emitEvent(
        -1,
        'parallel_completed',
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
      const reviewPhases = [0, 4, 7].filter((p) => executionPlanToPhases(executionPlan).includes(p));
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

      // Run consistency / quality gate checks before surfacing the review gate
      const autoGateReport = await consistencyChecker.run(this.auditId, lastWingPhase, wingPhases);

      // Persist quality gate result on the review_points row for this gate
      await supabase.from('review_points')
        .update({ quality_gate_passed: autoGateReport.passed })
        .eq('audit_id', this.auditId)
        .eq('after_phase', lastWingPhase);

      // Gate after auto wing (if applicable)
      if (reviewPhases.includes(lastWingPhase)) {
        await this.emitEvent(lastWingPhase, 'review_needed', pipelineOrchestratorCopy().phase.reviewNeeded);
        const setReview = await this.updateAuditIfNotCancelled({ status: 'review' });
        if (!setReview) throw new PipelineCancelledError();
      }
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
        const finalGateReport = await consistencyChecker.run(this.auditId, 7, allDomainPhases);

        // Persist quality gate result on the final review_points row (after phase 7)
        await supabase.from('review_points')
          .update({ quality_gate_passed: finalGateReport.passed })
          .eq('audit_id', this.auditId)
          .eq('after_phase', 7);
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
    const ocFs = pipelineOrchestratorCopy();
    try {
      logger.info('Free snapshot started', { audit_id: this.auditId });

      await supabase.from('audits').update({ status: 'recon', current_phase: 0 }).eq('id', this.auditId);
      await this.emitEvent(0, 'started', ocFs.freeSnapshot.started);

      const { preview } = await runDeterministicSnapshot(this.auditId);

      await this.emitEvent(4, 'completed', ocFs.freeSnapshot.completed);

      logger.info('Free snapshot completed', { audit_id: this.auditId });
      return preview;

    } catch (err) {
      const error = err as Error;
      if (error instanceof SnapshotAtCapacityError) {
        logger.warn('Free snapshot capacity', { audit_id: this.auditId });
        await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
        await this.emitEvent(0, 'error', ocFs.freeSnapshot.errorCapacity, {
          error_code: PIPELINE_EVENT_ERROR_CODES.SNAPSHOT_AT_CAPACITY,
        });
        throw err;
      }
      logger.error('Free snapshot failed', {
        audit_id: this.auditId,
        error: error.message,
        stack: error.stack,
      });
      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
      await this.emitEvent(0, 'error', ocFs.freeSnapshot.errorGeneric, {
        error_code: PIPELINE_EVENT_ERROR_CODES.FREE_SNAPSHOT_FAILED,
      });
      throw err;
    }
  }

  /**
   * Writes `pipeline_events` and mirrors lifecycle into in-app notifications.
   * Copy is sourced from `pipeline-orchestrator-copy.v1.json` (orchestrator) and agent JSON, not ad hoc strings.
   */
  private async emitEvent(phase: number, eventType: string, message: string, data: Record<string, unknown> = {}): Promise<void> {
    updateContext({ auditId: this.auditId });
    const ctx = getContext();
    await supabase.from('pipeline_events').insert({
      audit_id: this.auditId,
      phase,
      event_type: eventType,
      message,
      data: {
        ...data,
        trace_id: ctx?.traceId,
        operation_id: ctx?.operationId,
      },
    });

    if (phase >= 0 && ['started', 'completed', 'error'].includes(eventType)) {
      const mappedStatus = eventType === 'started'
        ? 'running'
        : eventType === 'completed'
          ? 'completed'
          : 'failed';
      const now = new Date();
      await supabase.from('phase_runs').upsert(
        {
          audit_id: this.auditId,
          phase,
          attempt: 1,
          status: mappedStatus,
          lease_owner: `pid:${process.pid}`,
          lease_expires_at: new Date(now.getTime() + STALLED_PHASE_TIMEOUT_MIN * 60_000).toISOString(),
          heartbeat_at: now.toISOString(),
          ...(eventType === 'error' ? { error_message: message } : {}),
        },
        { onConflict: 'audit_id,phase,attempt' },
      );
    }

    // Keep in-app notifications concise and limited to user-relevant lifecycle changes.
    if (['started', 'completed', 'error', 'review_needed'].includes(eventType)) {
      const ocN = pipelineOrchestratorCopy();
      const titles = ocN.notifications.pipelinePhaseTitles;
      const title =
        (titles as Record<string, string>)[eventType] ?? titles.default;
      await emitStructuredNotification({
        category: eventType === 'review_needed' ? 'review' : 'pipeline',
        event: `pipeline_${eventType}`,
        priority: eventType === 'error' ? 'critical' : eventType === 'review_needed' ? 'medium' : 'low',
        audience: 'audit_participants',
        auditId: this.auditId,
        title,
        message,
        payload: {
          phase,
          event_type: eventType,
          ...data,
        },
      });
    }

    if (eventType === 'completed' && phase === 7) {
      const ocArt = pipelineOrchestratorCopy();
      const n = ocArt.notifications;
      await emitStructuredNotification({
        category: 'pipeline',
        event: 'artifact_strategy_ready',
        priority: 'low',
        audience: 'audit_participants',
        auditId: this.auditId,
        title: n.artifactTitle,
        message: n.artifactStrategyMessage,
        route: interpolateOrchestratorMessage(n.artifactStrategyRouteTemplate, { audit_id: this.auditId }),
        payload: {
          audit_id: this.auditId,
          artifact: 'strategy',
          actor_role: 'system',
        },
      });
      await emitStructuredNotification({
        category: 'pipeline',
        event: 'artifact_report_ready',
        priority: 'low',
        audience: 'audit_participants',
        auditId: this.auditId,
        title: n.artifactTitle,
        message: n.artifactReportMessage,
        route: interpolateOrchestratorMessage(n.artifactReportRouteTemplate, { audit_id: this.auditId }),
        payload: {
          audit_id: this.auditId,
          artifact: 'report',
          actor_role: 'system',
        },
      });
    }
  }
}

/**
 * Mark long-running active audits as stalled/failed so users can retry.
 * This is a minimal recovery guard until durable queue orchestration is introduced.
 */
export async function recoverStalledPipelines(timeoutMinutes = STALLED_PHASE_TIMEOUT_MIN): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60_000).toISOString();
  const { data: stuck, error } = await supabase
    .from('audits')
    .select('id,current_phase,status')
    .in('status', [...STALLED_PHASE_ACTIVE_STATUSES])
    .lt('updated_at', cutoff);

  if (error) {
    logger.error('pipeline.recover_stalled_load_failed', { error: error.message, timeout_minutes: timeoutMinutes });
    return 0;
  }
  if (!stuck || stuck.length === 0) return 0;

  const ocStall = pipelineOrchestratorCopy();
  for (const audit of stuck) {
    await supabase.from('pipeline_events').insert({
      audit_id: audit.id,
      phase: Number(audit.current_phase ?? -1),
      event_type: 'phase_stalled',
      message: interpolateOrchestratorMessage(ocStall.recoverStalled.messageTemplate, {
        timeout_minutes: timeoutMinutes,
      }),
      data: {
        timeout_minutes: timeoutMinutes,
        previous_status: audit.status,
      },
    });
    await supabase.from('audits').update({ status: 'failed' }).eq('id', audit.id);
  }

  return stuck.length;
}
