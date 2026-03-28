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
import { REVIEW_AFTER_PHASES, PHASE_DOMAIN_MAP, type FreeSnapshotPreview } from '../types/audit.js';

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
 * Pipeline Orchestrator
 *
 * Manages the phase sequencing:
 * Phase 0 (Recon) → [review] → Phases 1-4 (Auto) → [review] → Phases 5-6 (Analytic) → [review] → Phase 7 (Strategy)
 *
 * Each phase: COLLECT → ASSEMBLE → CALL CLAUDE → FACT-CHECK → SAVE
 */
export class PipelineOrchestrator {
  private auditId: string;

  constructor(auditId: string) {
    this.auditId = auditId;
  }

  /**
   * Start a specific phase.
   */
  async startPhase(phase: number): Promise<void> {
    const AgentClass = PHASE_AGENTS[phase];
    if (!AgentClass) {
      throw new Error(`Unknown phase: ${phase}`);
    }

    try {
      // Brief gate — Phase 0 is blocked for express/full until SLA questions are answered
      if (phase === 0) {
        await assertBriefReady(this.auditId);
      }

      // Emit start event
      await this.emitEvent(phase, 'started', `Phase ${phase} started: ${PHASE_DOMAIN_MAP[phase]}`);

      // Update audit status
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

      // Save result (base agent handles domain saving, recon/strategy handle their own)
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await agent.saveDomainResult(result);
      }

      // Check if this phase triggers a review point
      if (REVIEW_AFTER_PHASES.includes(phase as 0 | 4 | 7)) {
        await this.emitEvent(phase, 'review_needed', `Review point: approve before continuing`);
        await supabase.from('audits').update({ status: 'review' }).eq('id', this.auditId);
      }

      // Emit completion
      await this.emitEvent(phase, 'completed', `Phase ${phase} completed`, {
        score: result.score > 0 ? result.score : undefined,
      });

    } catch (err) {
      const error = err as Error;
      console.error(`[Pipeline ${this.auditId}] Phase ${phase} error:`, error.message);

      // Update domain status to failed
      const domainKey = PHASE_DOMAIN_MAP[phase];
      if (domainKey !== 'recon' && domainKey !== 'strategy') {
        await supabase.from('audit_domains').update({ status: 'failed' })
          .eq('audit_id', this.auditId)
          .eq('domain_key', domainKey);
      }

      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);

      await this.emitEvent(phase, 'error', error.message, {
        stack: error.stack?.substring(0, 500),
      });

      throw err;
    }
  }

  /**
   * Auto-run: execute all phases in the current block until a review point.
   * Call this after a review approval to auto-run the next block.
   */
  async runBlock(): Promise<void> {
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select('current_phase, status')
      .eq('id', this.auditId)
      .single();

    if (auditErr || !audit) return;

    let phase = audit.current_phase + 1;

    while (phase <= 7) {
      // Check for pending review before this phase
      const isReviewBefore = REVIEW_AFTER_PHASES.includes((phase - 1) as 0 | 4 | 7);
      if (isReviewBefore && phase > audit.current_phase + 1) {
        // Already past the first phase in the block, check if review is approved
        const { data: review } = await supabase
          .from('review_points')
          .select('status')
          .eq('audit_id', this.auditId)
          .eq('after_phase', phase - 1)
          .single();

        if (review?.status !== 'approved') break;
      }

      await this.startPhase(phase);

      // Stop at review points
      if (REVIEW_AFTER_PHASES.includes(phase as 0 | 4 | 7)) {
        break;
      }

      phase++;
    }
  }

  /**
   * Free Snapshot pipeline — runs Phase 0 (Recon) + Phase 4 (UX partial).
   * No auth required; result is trimmed to 2 issues + 2 quick wins.
   * Does NOT trigger review gates.
   */
  async runFreeSnapshot(): Promise<FreeSnapshotPreview> {
    try {
      console.log(`[FreeSnapshot ${this.auditId}] Starting`);

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

      console.log(`[FreeSnapshot ${this.auditId}] Completed`);

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
      console.error(`[FreeSnapshot ${this.auditId}] Error:`, error.message);
      await supabase.from('audits').update({ status: 'failed' }).eq('id', this.auditId);
      await this.emitEvent(0, 'error', error.message);
      throw err;
    }
  }

  private async emitEvent(phase: number, eventType: string, message: string, data: Record<string, unknown> = {}): Promise<void> {
    await supabase.from('pipeline_events').insert({
      audit_id: this.auditId,
      phase,
      event_type: eventType,
      message,
      data,
    });
  }
}
