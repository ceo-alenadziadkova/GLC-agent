import { BaseAgent, loadPrompt } from './base.js';
import {
  interpolatePipelineEventMessage,
  pipelineStrategyEventCopy,
} from '../config/pipeline-events-copy.js';
import { type StrategyOutput, StrategyOutputSchema } from '../schemas/domain-output.js';
import { writeStrategyCompletionToDatabase } from '../services/strategy/strategy-completion-db.js';
import { hydrateStrategyAfterParse } from '../services/strategy/hydrate-strategy-after-parse.js';
import { MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
import type { DomainResult } from '../types/audit.js';
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

    await writeStrategyCompletionToDatabase({
      auditId: this.auditId,
      payload,
    });
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

    const hydrated = await hydrateStrategyAfterParse({
      auditId: this.auditId,
      strategyResult,
      coalitionAlignmentResponses: context.coalition_alignment_responses,
    });
    const { weightedScore } = hydrated;
    const missingCrossDomainDependencyIds = hydrated.missingCrossDomainDependencyIds;

    if (missingCrossDomainDependencyIds.length > 0) {
      await this.emit(PIPELINE_EVENT_TYPES.qualityGate, COALITION_STRATEGY_MISSING_DEPENDENCIES_WARNING, {
        gate: 'coalition_strategy_cross_domain_dependencies',
        initiative_ids: missingCrossDomainDependencyIds,
      });
    }

    this.lastRawDomainResult = hydrated.lastRawDomainResult;
    this.lastControlObject = hydrated.lastControlObject;

    this.pendingPersistence = {
      strategyResult: hydrated.strategyResult,
      weightedScore: hydrated.weightedScore,
      quick_wins: hydrated.quick_wins,
      medium_term: hydrated.medium_term,
      strategic: hydrated.strategic,
    };

    await this.emit('completed', ev.completed, {
      overall_score: weightedScore,
      quick_wins_count: strategyResult.quick_wins.length,
      medium_term_count: strategyResult.medium_term.length,
      strategic_count: strategyResult.strategic.length,
    });

    return hydrated.cleanedOutput;
  }
}

