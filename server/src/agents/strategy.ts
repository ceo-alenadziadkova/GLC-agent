import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent } from './base.js';
import { StrategyOutputSchema, zodToJsonSchema } from '../schemas/domain-output.js';
import { supabase } from '../services/supabase.js';
import { calculateWeightedScore } from '../config/industry-weights.js';
import { CLAUDE_MODEL, MIN_TOKEN_RESERVE, MODEL_MAX_TOKENS } from '../config/model.js';
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

  get instructions() {
    return `You are a senior IT strategy consultant synthesizing a complete business audit into an actionable roadmap.

You have access to ALL domain analysis results (Tech, Security, SEO, UX, Marketing, Automation) plus the reconnaissance data and any consultant/interview notes.

Your task:
1. **Executive Summary** (200-500 words): Holistic assessment of the company's digital maturity. Highlight the biggest strengths and most critical gaps. Be honest but constructive.

2. **Overall Score**: A weighted composite score (1-5) based on all domain scores. Consider the industry weights provided.

3. **Quick Wins** (2-5 items, ≤ 1 week each): Immediate improvements with high impact and low effort. Pull from domain quick_wins but prioritize cross-domain ones.

4. **Medium-Term Initiatives** (2-5 items, ~1 month): Significant improvements that require planning. Combine related recommendations across domains.

5. **Strategic Investments** (1-3 items, 1-3 months): Major transformative projects. Consider dependencies between domains.

6. **Scorecard**: Summary table with each domain's score, weight, and weighted contribution.

Each initiative must include:
- Clear title and description
- Impact level (high/medium/low)
- Effort level (low/medium/high)
- Dependencies on other initiatives (if any)

Focus on BUSINESS IMPACT, not just technical fixes. Frame everything in terms of revenue, efficiency, risk reduction, or competitive advantage.

Use the submit_analysis tool to return your structured roadmap.`;
  }

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

    const { prompt } = this.contextBuilder.formatPrompt(context);
    const response = await this.anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MODEL_MAX_TOKENS.strategy,
      messages: [{ role: 'user', content: prompt }],
      tools: [{
        name: 'submit_analysis',
        description: 'Submit the strategic roadmap',
        input_schema: zodToJsonSchema(StrategyOutputSchema) as Anthropic.Tool['input_schema'],
      }],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
    });

    await this.tokenTracker.log(this.auditId, 7, {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      model: CLAUDE_MODEL,
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') throw new Error('No tool_use response');

    const strategyResult = StrategyOutputSchema.parse(toolBlock.input);

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
    };
  }
}
