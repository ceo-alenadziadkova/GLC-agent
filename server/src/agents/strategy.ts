import { BaseAgent, loadPrompt } from './base.js';
import {
  interpolatePipelineEventMessage,
  pipelineStrategyEventCopy,
} from '../config/pipeline-events-copy.js';
import { STRATEGY_INITIATIVE_SCHEMA_VERSION } from '../config/strategy-initiative-policy.js';
import { type StrategyOutput, StrategyOutputSchema } from '../schemas/domain-output.js';
import { supabase } from '../services/supabase.js';
import {
  buildDomainIssueIdIndex,
  buildStrategyBriefConstraintSnapshot,
  mergeBriefSnapshotWithLabOverrides,
} from '../services/strategy/strategy-brief-constraint-snapshot.js';
import {
  collectMissingCrossDomainDependencyIds,
  postProcessStrategyInitiatives,
} from '../services/strategy/strategy-initiative-post-process.js';
import { calculateWeightedScore } from '../config/industry-weights.js';
import { MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
import type { DomainKey, DomainResult } from '../types/audit.js';
import { fetchAuditGovernanceRiskProfile } from '../lib/audit-governance-risk-profile.js';
import { buildStrategyNarrowControlObject } from '../services/governance/narrow/build-strategy-narrow-control-object.js';
import { logger } from '../services/logger.js';
import {
  assertPhaseRunLeaseHeld,
  getPhaseRunLeaseContext,
} from '../services/pipeline/phase-run-lease-context.js';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { COALITION_STRATEGY_MISSING_DEPENDENCIES_WARNING } from '../config/coalition-protocol-policy.js';

type StrategyPersistPayload = {
  strategyResult: StrategyOutput;
  weightedScore: number;
  quick_wins: StrategyOutput['quick_wins'];
  medium_term: StrategyOutput['medium_term'];
  strategic: StrategyOutput['strategic'];
};

function coalitionAlignmentsIndicateDependencies(rows: Array<Record<string, unknown>> | undefined): boolean {
  return (rows ?? []).some((row) => {
    const alignment = row.alignment;
    if (!alignment || typeof alignment !== 'object') return false;
    const reactions = (alignment as { cross_domain_reactions?: unknown }).cross_domain_reactions;
    return Array.isArray(reactions)
      && reactions.some((reaction) => (
        Boolean(reaction)
        && typeof reaction === 'object'
        && (reaction as { relation?: unknown }).relation === 'depends_on'
      ));
  });
}

/**
 * Phase 7: Strategy & Roadmap Synthesis
 * Reads ALL previous domain results + recon + review notes.
 * Produces the final strategic roadmap.
 */
export class StrategyAgent extends BaseAgent {
  get phaseNumber() { return 7; }
  get domainKey() { return 'strategy' as const; }
  get outputSchema() { return StrategyOutputSchema; }
  get collectors() { return []; } // No data collection — synthesis only

  get instructions() { return loadPrompt('strategy'); }

  private pendingPersistence: StrategyPersistPayload | null = null;

  /**
   * Persists strategy row + audit completion after narrow governance is published.
   */
  async finalizeStrategyPersistence(): Promise<void> {
    const payload = this.pendingPersistence;
    if (!payload) {
      throw new Error('StrategyAgent.finalizeStrategyPersistence called without a completed run()');
    }
    this.pendingPersistence = null;

    const leaseCtx = getPhaseRunLeaseContext();
    if (leaseCtx) {
      await assertPhaseRunLeaseHeld({
        auditId: this.auditId,
        phase: this.phaseNumber,
        attempt: leaseCtx.attempt,
        expectedOwner: leaseCtx.leaseOwner,
      });
    }

    const { error: strategyErr } = await supabase.from('audit_strategy').update({
      status: 'completed',
      executive_summary: payload.strategyResult.executive_summary,
      overall_score: payload.weightedScore,
      quick_wins: payload.quick_wins,
      medium_term: payload.medium_term,
      strategic: payload.strategic,
      scorecard: payload.strategyResult.scorecard,
      schema_version: STRATEGY_INITIATIVE_SCHEMA_VERSION.v2,
    }).eq('audit_id', this.auditId);

    if (strategyErr) {
      logger.error('strategy.finalize_audit_strategy_update_failed', {
        component: 'strategy',
        audit_id: this.auditId,
        error: strategyErr.message,
      });
      throw strategyErr;
    }

    const { error: auditErr } = await supabase.from('audits').update({
      status: 'completed',
      overall_score: payload.weightedScore,
      current_phase: 7,
    }).eq('id', this.auditId);

    if (auditErr) {
      logger.error('strategy.finalize_audits_update_failed', {
        component: 'strategy',
        audit_id: this.auditId,
        error: auditErr.message,
      });
      throw auditErr;
    }
  }

  /**
   * Override run() to handle strategy-specific flow (governance before DB finalize).
   */
  async run(): Promise<DomainResult> {
    const ev = pipelineStrategyEventCopy();
    await this.emit('assembling_context', ev.assemblingContext);
    const context = await this.contextBuilder.build(
      this.auditId, this.phaseNumber, 'strategy', {}, this.instructions
    );

    await this.emit('analyzing', ev.analyzing);
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) throw new Error('Token budget exceeded');
    if (budget.remaining < MIN_TOKEN_RESERVE) {
      throw new Error(`Insufficient token reserve: ${budget.remaining} remaining, need at least ${MIN_TOKEN_RESERVE}`);
    }
    if (budget.is_approaching_limit) {
      await this.emit(
        'warning',
        interpolatePipelineEventMessage(ev.tokenBudgetWarning, {
          pct: Math.round((budget.tokens_used / budget.token_budget) * 100),
          remaining: budget.remaining,
        }),
      );
    }

    const rawStrategy = await this.callClaudeWithRetry(context, StrategyOutputSchema, MODEL_MAX_TOKENS.strategy);
    const strategyResult = StrategyOutputSchema.parse(rawStrategy);

    const { data: domains } = await supabase
      .from('audit_domains')
      .select('domain_key, score')
      .eq('audit_id', this.auditId)
      .eq('status', 'completed');

    const { data: audit } = await supabase
      .from('audits')
      .select('industry')
      .eq('id', this.auditId)
      .single();

    const domainScores = (domains ?? [])
      .filter(d => d.score != null)
      .map(d => ({ domain_key: d.domain_key as DomainKey, score: d.score! }));

    const weightedScore = domainScores.length > 0
      ? calculateWeightedScore(domainScores, audit?.industry ?? null)
      : strategyResult.overall_score;

    const { data: domainIssueRows } = await supabase
      .from('audit_domains')
      .select('domain_key, issues')
      .eq('audit_id', this.auditId)
      .eq('status', 'completed');

    const [{ data: briefRow }, { data: labRow }] = await Promise.all([
      supabase.from('intake_brief').select('responses').eq('audit_id', this.auditId).maybeSingle(),
      supabase.from('audit_strategy').select('strategy_lab_context').eq('audit_id', this.auditId).maybeSingle(),
    ]);

    const briefResponses =
      briefRow?.responses && typeof briefRow.responses === 'object' && !Array.isArray(briefRow.responses)
        ? (briefRow.responses as Record<string, unknown>)
        : undefined;
    const briefSnapshot = mergeBriefSnapshotWithLabOverrides(
      buildStrategyBriefConstraintSnapshot(briefResponses),
      labRow?.strategy_lab_context,
    );
    const issueIndex = buildDomainIssueIdIndex(domainIssueRows ?? []);
    const requireCrossDomainDependencies = coalitionAlignmentsIndicateDependencies(
      context.coalition_alignment_responses,
    );

    const quick_wins = postProcessStrategyInitiatives(
      strategyResult.quick_wins,
      briefSnapshot,
      issueIndex,
      { requireCrossDomainDependencies },
    );
    const medium_term = postProcessStrategyInitiatives(
      strategyResult.medium_term,
      briefSnapshot,
      issueIndex,
      { requireCrossDomainDependencies },
    );
    const strategic = postProcessStrategyInitiatives(
      strategyResult.strategic,
      briefSnapshot,
      issueIndex,
      { requireCrossDomainDependencies },
    );

    const missingCrossDomainDependencyIds = collectMissingCrossDomainDependencyIds(
      [...quick_wins, ...medium_term, ...strategic],
      requireCrossDomainDependencies,
    );

    if (missingCrossDomainDependencyIds.length > 0) {
      await this.emit(PIPELINE_EVENT_TYPES.qualityGate, COALITION_STRATEGY_MISSING_DEPENDENCIES_WARNING, {
        gate: 'coalition_strategy_cross_domain_dependencies',
        initiative_ids: missingCrossDomainDependencyIds,
      });
    }

    this.lastRawDomainResult = { ...strategyResult } as unknown as Record<string, unknown>;

    const executionMode = await this.resolveExecutionMode();
    const riskProfile = await fetchAuditGovernanceRiskProfile(this.auditId);

    this.lastControlObject = buildStrategyNarrowControlObject({
      auditId: this.auditId,
      executionMode,
      riskProfile,
      strategyResult,
      weightedOverallScore: weightedScore,
      completedDomainCount: domainScores.length,
    });

    this.pendingPersistence = {
      strategyResult,
      weightedScore,
      quick_wins,
      medium_term,
      strategic,
    };

    await this.emit('completed', ev.completed, {
      overall_score: weightedScore,
      quick_wins_count: strategyResult.quick_wins.length,
      medium_term_count: strategyResult.medium_term.length,
      strategic_count: strategyResult.strategic.length,
    });

    return {
      score: Math.round(weightedScore),
      label: 'Strategy',
      summary: strategyResult.executive_summary,
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    };
  }
}
