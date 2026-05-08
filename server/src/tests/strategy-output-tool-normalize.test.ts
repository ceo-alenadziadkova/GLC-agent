import { describe, expect, it } from 'vitest';

import { normalizeStrategyToolInputForSchema } from '../services/strategy/strategy-output-tool-normalize.js';

describe('normalizeStrategyToolInputForSchema', () => {
  it('parses JSON array strings for strategic (and logs mutation code)', () => {
    const initiative = { id: 'S-1', title: 'Test' };
    const raw = {
      strategic: JSON.stringify([initiative]),
    };
    const out = normalizeStrategyToolInputForSchema(raw);
    expect(out.mutated).toBe(true);
    expect(out.mutationCodes).toContain('strategic_json_string_array');
    expect((out.value as Record<string, unknown>).strategic).toEqual([initiative]);
  });

  it('wraps a single initiative object into a one-element array', () => {
    const initiative = { id: 'S-1' };
    const out = normalizeStrategyToolInputForSchema({ strategic: initiative });
    expect(out.mutated).toBe(true);
    expect(out.mutationCodes).toContain('strategic_single_object_wrapped');
    expect((out.value as Record<string, unknown>).strategic).toEqual([initiative]);
  });

  it('parses a single JSON object string into a one-element array', () => {
    const initiative = { id: 'S-1', title: 'T' };
    const out = normalizeStrategyToolInputForSchema({
      strategic: JSON.stringify(initiative),
    });
    expect(out.mutated).toBe(true);
    expect(out.mutationCodes).toContain('strategic_json_string_single_object_wrapped');
    expect((out.value as Record<string, unknown>).strategic).toEqual([initiative]);
  });

  it('coerces scorecard the same way', () => {
    const row = { domain_key: 'tech_infrastructure', label: 'T', score: 3, weight: 1, weighted_score: 3 };
    const out = normalizeStrategyToolInputForSchema({
      scorecard: JSON.stringify([row]),
    });
    expect(out.mutated).toBe(true);
    expect((out.value as Record<string, unknown>).scorecard).toEqual([row]);
  });

  it('leaves invalid JSON strings untouched', () => {
    const prose = 'First, prioritize resilience across domains.';
    const out = normalizeStrategyToolInputForSchema({ strategic: prose });
    expect(out.mutated).toBe(false);
    expect((out.value as Record<string, unknown>).strategic).toBe(prose);
  });

  it('coerces initiative stage synonyms (e.g. launching → mvp) in all buckets', () => {
    const init = {
      id: 'Q-1',
      title: 'T',
      description: 'D'.repeat(50),
      domain: 'tech_infrastructure',
      stage: 'launching',
      priority: 'high',
      impact: 'high',
      effort: 'low',
      confidence: 0.7,
      context: { signals: ['signal one is long enough here'] },
      outcome: { description: 'outcome described with enough chars here' },
      scope: { includes: ['a'], excludes: ['b'] },
      execution_paths: [
        {
          type: 'fast',
          description: 'path description long enough here',
          time_estimate: '~1 week',
        },
      ],
      decision: { why_this: ['why'] },
      evidence: {
        sources: [{ domain_key: 'tech_infrastructure', signal: 'x' }],
        cross_domain_dependencies: [],
      },
    };
    const out = normalizeStrategyToolInputForSchema({
      quick_wins: [structuredClone(init)],
      medium_term: [structuredClone(init)],
      strategic: [structuredClone(init)],
    });
    expect(out.mutated).toBe(true);
    expect(out.mutationCodes.some(c => c.includes('initiative_stage_coerced'))).toBe(true);
    const v = out.value as Record<string, unknown>;
    expect((v.quick_wins as { stage: string }[])[0].stage).toBe('mvp');
    expect((v.medium_term as { stage: string }[])[0].stage).toBe('mvp');
    expect((v.strategic as { stage: string }[])[0].stage).toBe('mvp');
  });
});
