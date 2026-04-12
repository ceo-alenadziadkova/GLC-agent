import {
  interpolateOrchestratorMessage,
  pipelineOrchestratorCopy,
} from '../config/pipeline-orchestrator-copy.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
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
  PHASE_DOMAIN_MAP,
  maxPhaseForMode,
  reviewPhasesForMode,
  type DomainKey,
  type FreeSnapshotPreview,
  type ProductMode,
} from '../types/audit.js';
import { recordEvaluationDatasetIfEnabled } from './evaluation-dataset-writer.js';
import { PIPELINE_EVENT_ERROR_CODES } from '../config/pipeline-event-error-codes.js';
import type { ControlObjectV1 } from '../schemas/control-object.js';

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

  constructor(auditId: string) {
    this.auditId = auditId;
  }

  /**
   * Applies DecisionLayer (sets canonical `decision_hint`), persists CONTROL_OBJECT v1, and emits
   * `refine_recommended` when the hint is `refine`. FactChecker only builds the pre-decision snapshot.
   */
  private async publishControlObjectGovernance(
    phase: number,
    controlObject: ControlObjectV1
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

  /** Fetch the product_mode for this audit. Falls back to `DEFAULT_AUDIT_PRODUCT_MODE` on error. */
  private async getProductMode(): Promise<ProductMode> {
    const { data } = await supabase
      .from('audits')
      .select('product_mode')
      .eq('id', this.auditId)
      .single();
    return (data?.product_mode as ProductMode) ?? DEFAULT_AUDIT_PRODUCT_MODE;
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
      // Mode ceiling — reject phases beyond what this product mode allows
      const mode = await this.getProductMode();
      const maxPhase = maxPhaseForMode(mode);
      if (phase > maxPhase) {
        throw new Error(`Phase ${phase} is not available for product_mode '${mode}' (max: ${maxPhase})`);
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
      await supabase.from('audits').update({
        status: statusMap[phase] ?? 'auto',
        current_phase: phase,
      }).eq('id', this.auditId);

      // Update domain status to 'collecting' (if applicable)
      const domainKey = PHASE_DOMAIN_MAP[phase];
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'collecting' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      // Run the agent
      const agent = new AgentClass(this.auditId);
      const result = await agent.run();

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        // ─── Decision Layer (Phase 1: advisory / log only) ──────
        // In Phase 1, refine hint does NOT block or auto-rerun.
        // It emits an event for consultant awareness.
        // Phase 5 activates auto-loop via AUTO_LOOP_ENABLED flag.
        const controlObject = (agent as BaseAgent).lastControlObject;
        if (controlObject) {
          await this.publishControlObjectGovernance(phase, controlObject);
          await recordEvaluationDatasetIfEnabled({
            auditId: this.auditId,
            phaseId: domainKey as DomainKey,
            controlObject,
            rawAgentOutput: (agent as BaseAgent).lastRawDomainResult,
            cleanedOutput: result,
          });
        }

        await agent.saveDomainResult(result);
      }

      // Check if this phase triggers a review point
      if ((reviewPhasesForMode(mode) as readonly number[]).includes(phase)) {
        await this.emitEvent(phase, 'review_needed', ocStart.phase.reviewNeeded);
        await supabase.from('audits').update({ status: 'review' }).eq('id', this.auditId);
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

      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
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
      const result = await agent.run();

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        // ─── Decision Layer (isolated path — same advisory logic) ──
        const controlObject = (agent as BaseAgent).lastControlObject;
        if (controlObject) {
          await this.publishControlObjectGovernance(phase, controlObject);
          await recordEvaluationDatasetIfEnabled({
            auditId: this.auditId,
            phaseId: domainKey as DomainKey,
            controlObject,
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
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        failedDomains.push(String(PHASE_DOMAIN_MAP[phases[i]]));
      }
    });

    if (failedDomains.length === phases.length) {
      // Total failure — mark audit failed
      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
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
      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
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
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('current_phase, status')
      .eq('id', this.auditId)
      .single();

    if (auditErr || !audit) {
      logger.error('Run block failed to load audit', { audit_id: this.auditId, error: auditErr?.message ?? 'missing' });
      throw new Error('Audit not found while running block');
    }

    const mode = await this.getProductMode();
    const maxPhase = maxPhaseForMode(mode);
    const reviewPhases = reviewPhasesForMode(mode) as readonly number[];
    const nextPhase = audit.current_phase + 1;

    if (nextPhase > maxPhase) return; // All phases complete

    // ── Auto wing: phases 1-4 (or subset for express) ────────────────
    if ((AUTO_WING_PHASES as readonly number[]).includes(nextPhase)) {
      const wingPhases = AUTO_WING_PHASES.filter(p => p <= maxPhase);
      const lastWingPhase = Math.max(...wingPhases);

      await supabase.from('audits').update({ status: 'auto', current_phase: nextPhase }).eq('id', this.auditId);

      await this.runParallelBlock(wingPhases);

      // Record last completed wing phase
      await supabase.from('audits').update({ current_phase: lastWingPhase }).eq('id', this.auditId);

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
        await supabase.from('audits').update({ status: 'review' }).eq('id', this.auditId);
      }
      return;
    }

    // ── Analytic wing: phases 5-6, then Strategy ─────────────────────
    if ((ANALYTIC_WING_PHASES as readonly number[]).includes(nextPhase)) {
      const wingPhases = ANALYTIC_WING_PHASES.filter(p => p <= maxPhase);
      const lastWingPhase = Math.max(...wingPhases);

      await supabase.from('audits').update({ status: 'analytic', current_phase: nextPhase }).eq('id', this.auditId);

      await this.runParallelBlock(wingPhases);

      await supabase.from('audits').update({ current_phase: lastWingPhase }).eq('id', this.auditId);

      // Continue to Strategy (phase 7) without an intermediate gate
      if (maxPhase >= 7) {
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
