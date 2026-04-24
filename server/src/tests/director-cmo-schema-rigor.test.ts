import { describe, expect, it } from 'vitest';

import { CmoPositioningOutputSchema } from '../schemas/sub-agents/cmo/positioning.js';
import { CmoContentStrategyOutputSchema } from '../schemas/sub-agents/cmo/content-strategy.js';
import { CmoTrafficOutputSchema } from '../schemas/sub-agents/cmo/traffic.js';

describe('director CMO schema rigor', () => {
  it('rejects shallow positioning payload', () => {
    const parsed = CmoPositioningOutputSchema.safeParse({
      core_problem: 'Growth',
      unique_mechanism: 'Method',
      differentiation_axes: ['speed'],
      anti_positioning: 'Cheap',
      target_niche: 'SMB',
      category_strategy: 'Consulting',
      positioning_statement: 'We help.',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects shallow content strategy notes', () => {
    const parsed = CmoContentStrategyOutputSchema.safeParse({
      ideas: Array.from({ length: 50 }, (_, idx) => ({
        title: `Idea ${idx + 1}`,
        content_goal: 'education',
        awareness_stage: ['problem_aware', 'solution_aware', 'product_aware'][idx % 3],
        format: 'article',
        strategic_note: 'Too short',
        evidence_type: 'assumed',
        confidence_score: 0.3,
        assumptions: ['No data'],
        open_questions: ['Need data'],
        validation_next_step: 'Validate this',
        analysis_mode: 'deterministic_fallback',
      })),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects weak traffic hypothesis payload', () => {
    const parsed = CmoTrafficOutputSchema.safeParse({
      hypotheses: Array.from({ length: 20 }, () => ({
        channel: 'ad',
        mechanism: 'quick plan',
        expected_outcome: 'more leads',
        difficulty: 'low',
        cost: 'low',
        time_to_first_results: 'weeks',
        dependencies: ['a'],
        priority_score: 11,
        evidence_type: 'assumed',
        confidence_score: 0.3,
        assumptions: ['No baseline'],
        validation_next_step: 'Run test',
        expected_outcome_metric: 'sql_rate',
        analysis_mode: 'deterministic_fallback',
      })),
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects duplicate content ideas by title and format', () => {
    const parsed = CmoContentStrategyOutputSchema.safeParse({
      ideas: Array.from({ length: 50 }, (_, idx) => ({
        title: idx < 2 ? 'Duplicate Idea' : `Idea ${idx + 1}`,
        content_goal: 'education',
        awareness_stage: ['problem_aware', 'solution_aware', 'product_aware'][idx % 3],
        format: idx < 2 ? 'article' : 'video',
        strategic_note: 'This idea aligns with constraints and supports funnel progression.',
        evidence_type: 'derived',
        confidence_score: 0.55,
        assumptions: ['Audience intent remains stable across channels'],
        open_questions: ['Which segment converts best from this angle?'],
        validation_next_step: 'Test with a single segment and measure conversion movement.',
        analysis_mode: 'researched',
      })),
    });
    expect(parsed.success).toBe(false);
  });
});
