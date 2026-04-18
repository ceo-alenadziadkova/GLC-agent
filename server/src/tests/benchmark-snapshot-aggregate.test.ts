import { describe, expect, it } from 'vitest';
import { aggregateRowsIntoGroups } from '../services/benchmark-snapshot.js';
import type { BenchmarkEvalRow } from '../services/benchmark-snapshot.js';

function row(
  phase_id: string,
  industry: string | null,
  overall: number,
  decision: string | null = 'accept',
): BenchmarkEvalRow {
  return {
    phase_id,
    decision_applied: decision,
    created_at: '2026-01-01T00:00:00Z',
    audits: { industry },
    control_object: {
      confidence: { overall },
      counts: {
        total_claims: 10,
        statuses: {
          likely_hallucination: 1,
          risky_promise: 2,
          unverified: 3,
        },
      },
      errors: { fixable: ['tone_x'], structural: [], data_gaps: [] },
    },
  };
}

describe('aggregateRowsIntoGroups', () => {
  it('routes null industry only into all bucket', () => {
    const groups = aggregateRowsIntoGroups([row('tech_infrastructure', null, 72)]);
    expect(groups.get('tech_infrastructure::all')?.scores).toEqual([72]);
    expect(groups.has('tech_infrastructure::fintech')).toBe(false);
  });

  it('duplicates tagged industry into specific and all', () => {
    const groups = aggregateRowsIntoGroups([row('seo_digital', 'Fintech Co', 55)]);
    expect(groups.get('seo_digital::fintech_co')?.scores).toEqual([55]);
    expect(groups.get('seo_digital::all')?.scores).toEqual([55]);
  });

  it('accumulates error codes', () => {
    const groups = aggregateRowsIntoGroups([
      row('ux_conversion', null, 80),
      row('ux_conversion', null, 60),
    ]);
    const g = groups.get('ux_conversion::all');
    expect(g?.errorCounts.get('tone_x')).toBe(2);
  });
});
