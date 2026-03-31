import { supabase } from './supabase.js';
import { assertBriefReady } from './brief-validator.js';
import { consistencyChecker } from './consistency-checker.js';
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
import { getContext, updateContext } from './observability-context.js';
import {
  PHASE_DOMAIN_MAP,
  maxPhaseForMode,
  reviewPhasesForMode,
  type FreeSnapshotPreview,
  type ProductMode,
} from '../types/audit.js';

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

  /** Fetch the product_mode for this audit. Falls back to 'full' on error. */
  private async getProductMode(): Promise<ProductMode> {
    const { data } = await supabase
      .from('audits')
      .select('product_mode')
      .eq('id', this.auditId)
      .single();
    return (data?.product_mode as ProductMode) ?? 'full';
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
      await this.emitEvent(phase, 'started', `Phase ${phase} started: ${PHASE_DOMAIN_MAP[phase]}`);

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
        await agent.saveDomainResult(result);
      }

      // Check if this phase triggers a review point
      if ((reviewPhasesForMode(mode) as readonly number[]).includes(phase)) {
        await this.emitEvent(phase, 'review_needed', `Review point: approve before continuing`);
        await supabase.from('audits').update({ status: 'review' }).eq('id', this.auditId);
      }

      await this.emitEvent(phase, 'completed', `Phase ${phase} completed`, {
        score: result.score > 0 ? result.score : undefined,
      });

    } catch (err) {
      const error = err as Error;
      logger.error('Pipeline phase failed', { audit_id: this.auditId, phase, error: error.message });

      const domainKey = PHASE_DOMAIN_MAP[phase];
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'failed' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
      await this.emitEvent(phase, 'error', error.message, { stack: error.stack?.substring(0, 500) });

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
      await this.emitEvent(phase, 'started', `Phase ${phase} started: ${domainKey}`);

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'collecting' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      const agent = new AgentClass(this.auditId);
      const result = await agent.run();

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await agent.saveDomainResult(result);
      }

      await this.emitEvent(phase, 'completed', `Phase ${phase} completed`, {
        score: result.score > 0 ? result.score : undefined,
      });

    } catch (err) {
      const error = err as Error;
      logger.error('Pipeline parallel phase failed', { audit_id: this.auditId, phase, error: error.message });

      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'failed' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      await this.emitEvent(phase, 'error', error.message, { stack: error.stack?.substring(0, 500) });
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
    await this.emitEvent(-1, 'parallel_started', `Parallel block: phases [${phases.join(',')}]`);

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
      await this.emitEvent(-1, 'error', `All parallel phases failed: ${failedDomains.join(', ')}`);
      throw new Error(`All parallel phases failed: ${failedDomains.join(', ')}`);
    }

    if (failedDomains.length > 0) {
      await this.emitEvent(-1, 'partial_failure',
        `${failedDomains.length} domain(s) unavailable: ${failedDomains.join(', ')}. Pipeline continues.`,
        { domains_unavailable: failedDomains },
      );
    } else {
      await this.emitEvent(-1, 'parallel_completed', `Parallel block finished: phases [${phases.join(',')}]`);
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
        await this.emitEvent(lastWingPhase, 'review_needed', `Review point: approve before continuing`);
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
   * Free Snapshot pipeline — runs Phase 0 (Recon) + Phase 4 (UX partial).
   * No auth required; result is trimmed to 2 issues + 2 quick wins.
   * Does NOT trigger review gates.
   */
  async runFreeSnapshot(): Promise<FreeSnapshotPreview> {
    try {
      logger.info('Free snapshot started', { audit_id: this.auditId });

      // ── Phase 0: Recon ──────────────────────────────────
      await supabase.from('audits').update({ status: 'recon', current_phase: 0 }).eq('id', this.auditId);
      await this.emitEvent(0, 'started', 'Free Snapshot: Recon started');

      const reconAgent = new ReconAgent(this.auditId);
      await reconAgent.run(); // ReconAgent saves its own result

      await this.emitEvent(0, 'completed', 'Free Snapshot: Recon completed');

      // ── Phase 4: UX (partial) ───────────────────────────
      await supabase.from('audits').update({ status: 'auto', current_phase: 4 }).eq('id', this.auditId);
      await supabase.from('audit_domains').update({ status: 'collecting' })
        .eq('audit_id', this.auditId)
        .eq('domain_key', 'ux_conversion');
      await this.emitEvent(4, 'started', 'Free Snapshot: UX analysis started');

      const uxAgent = new UxAgent(this.auditId);
      const uxResult = await uxAgent.run();
      await uxAgent.saveDomainResult(uxResult);

      await this.emitEvent(4, 'completed', 'Free Snapshot: UX analysis completed');

      // ── Mark completed ──────────────────────────────────
      await supabase.from('audits').update({ status: 'completed' }).eq('id', this.auditId);

      // ── Fetch results ───────────────────────────────────
      const [{ data: audit }, { data: recon }] = await Promise.all([
        supabase.from('audits').select('snapshot_token, company_url, company_name').eq('id', this.auditId).single(),
        supabase.from('audit_recon').select('company_name, tech_stack, location').eq('audit_id', this.auditId).single(),
      ]);

      logger.info('Free snapshot completed', { audit_id: this.auditId });

      return {
        audit_id: this.auditId,
        snapshot_token: audit?.snapshot_token ?? '',
        status: 'completed',
        company_url: audit?.company_url ?? '',
        company_name: recon?.company_name ?? audit?.company_name ?? null,
        tech_stack: (recon?.tech_stack as Record<string, string[]>) ?? {},
        location: (recon?.location as string | null) ?? null,
        ux_score: uxResult.score,
        ux_label: uxResult.label,
        ux_summary: uxResult.summary,
        issues: uxResult.issues.slice(0, 2),
        quick_wins: uxResult.quick_wins.slice(0, 2),
      };

    } catch (err) {
      const error = err as Error;
      logger.error('Free snapshot failed', { audit_id: this.auditId, error: error.message });
      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
      await this.emitEvent(0, 'error', error.message);
      throw err;
    }
  }

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
  }
}
