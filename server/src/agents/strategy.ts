import { BaseAgent, loadPrompt } from './base.js';
import { StrategyOutputSchema } from '../schemas/domain-output.js';
import { supabase } from '../services/supabase.js';
import { calculateWeightedScore } from '../config/industry-weights.js';
import { MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
import type { DomainKey, DomainResult } from '../types/audit.js';

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

  /**
   * Override run() to handle strategy-specific saving.
   */
  async run(): Promise<DomainResult> {
    // Step 1: No collectors — go straight to context assembly
    await this.emit('assembling_context', 'Gathering all domain results...');
    const context = await this.contextBuilder.build(
      this.auditId, 'strategy', {}, this.instructions
    );

    // Step 2: Claude call
    await this.emit('analyzing', 'Synthesizing strategic roadmap...');
    const budget = await this.tokenTracker.checkBudget(this.auditId);
    if (!budget.within_budget) throw new Error('Token budget exceeded');
    if (budget.remaining < MIN_TOKEN_RESERVE) {
      throw new Error(`Insufficient token reserve: ${budget.remaining} remaining, need at least ${MIN_TOKEN_RESERVE}`);
    }
    if (budget.is_approaching_limit) {
      await this.emit('warning', `Token budget at ${Math.round((budget.tokens_used / budget.token_budget) * 100)}% — ${budget.remaining} tokens remaining`);
    }

    const strategyResult = await this.callClaudeWithRetry(context, StrategyOutputSchema, MODEL_MAX_TOKENS.strategy) as unknown as import('zod').infer<typeof StrategyOutputSchema>;

    // Calculate weighted score from actual domain scores
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

    // Save strategy
    await supabase.from('audit_strategy').update({
      status: 'completed',
      executive_summary: strategyResult.executive_summary,
      overall_score: weightedScore,
      quick_wins: strategyResult.quick_wins,
      medium_term: strategyResult.medium_term,
      strategic: strategyResult.strategic,
      scorecard: strategyResult.scorecard,
    }).eq('audit_id', this.auditId);

    // Update audit
    await supabase.from('audits').update({
      status: 'completed',
      overall_score: weightedScore,
      current_phase: 7,
    }).eq('id', this.auditId);

    await this.emit('completed', 'Strategic roadmap complete', {
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
