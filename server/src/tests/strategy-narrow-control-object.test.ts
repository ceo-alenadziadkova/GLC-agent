import { describe, expect, it } from 'vitest';
import { AGENT_OUTPUT_LIMITS } from '../config/agent-output-limits.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { StrategyInitiativeSchema, StrategyOutputSchema } from '../schemas/domain-output.js';
import { buildStrategyNarrowControlObject } from '../services/governance/narrow/build-strategy-narrow-control-object.js';

const STRATEGY_NARROW_CODES = SYSTEM_DEFAULTS.strategyNarrowGovernance.errorCodes;

function minimalStrategyOutput(overallScore: number) {
  const executiveSummary = 'y'.repeat(AGENT_OUTPUT_LIMITS.strategyExecutiveSummaryMinChars);
  const initiative = (id: string, title: string) =>
    StrategyInitiativeSchema.parse({
      id,
      title,
      description: 'Desc'.repeat(4),
      domain: 'marketing_utp',
      stage: 'growth',
      priority: 'high',
      impact: 'high',
      effort: 'medium',
      confidence: 0.7,
      context: { signals: ['Signal'] },
      outcome: { description: 'Outcome' },
      scope: { includes: ['A'], excludes: ['B'] },
      execution_paths: [
        { type: 'fast', description: 'Quick', time_estimate: '5d' },
        { type: 'scalable', description: 'Build', time_estimate: '3w' },
      ],
      decision: { why_this: ['Why'] },
      evidence: { sources: [{ domain_key: 'marketing_utp', signal: 'S' }] },
    });

  return StrategyOutputSchema.parse({
    executive_summary: executiveSummary,
    overall_score: overallScore,
    quick_wins: [initiative('q1', 'Quick one'), initiative('q2', 'Quick two')],
    medium_term: [initiative('m1', 'Medium one'), initiative('m2', 'Medium two')],
    strategic: [initiative('s1', 'Strategic one')],
    scorecard: [
      { domain_key: 'marketing_utp', label: 'M', score: 3, weight: 1, weighted_score: 3 },
    ],
  });
}

describe('buildStrategyNarrowControlObject', () => {
  it('marks governance_profile narrow and clears structural when model score aligns with weighted', () => {
    const strategyResult = minimalStrategyOutput(3);
    const co = buildStrategyNarrowControlObject({
      auditId: 'audit-1',
      executionMode: 'normal',
      riskProfile: null,
      strategyResult,
      weightedOverallScore: 3,
      completedDomainCount: 2,
    });
    expect(co.context.governance_profile).toBe('narrow');
    expect(co.context.phase_id).toBe('strategy');
    expect(co.errors.structural).toEqual([]);
    expect(co.confidence.overall).toBe(100);
  });

  it('adds structural mismatch when model overall diverges from weighted aggregate', () => {
    const strategyResult = minimalStrategyOutput(5);
    const co = buildStrategyNarrowControlObject({
      auditId: 'audit-1',
      executionMode: 'normal',
      riskProfile: null,
      strategyResult,
      weightedOverallScore: 2,
      completedDomainCount: 2,
    });
    expect(co.errors.structural).toContain(STRATEGY_NARROW_CODES.modelVsWeightedScoreMismatch);
    expect(co.confidence.overall).toBeLessThan(100);
  });

  it('flags data gap when no completed domain scores feed the aggregate', () => {
    const strategyResult = minimalStrategyOutput(4);
    const co = buildStrategyNarrowControlObject({
      auditId: 'audit-1',
      executionMode: 'normal',
      riskProfile: null,
      strategyResult,
      weightedOverallScore: 4,
      completedDomainCount: 0,
    });
    expect(co.errors.data_gaps).toContain(STRATEGY_NARROW_CODES.noCompletedDomainScores);
  });
});
