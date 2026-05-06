import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useStrategyLabReferencePreviews } from '../useStrategyLabReferencePreviews';
import type { StrategyRoadmap } from '../../data/audit/contracts/report/report-domain.types';

const strategy: StrategyRoadmap = {
  id: 'sr-1',
  audit_id: 'a1',
  status: 'ready',
  executive_summary: null,
  overall_score: null,
  quick_wins: [],
  medium_term: [],
  strategic: [],
  scorecard: [],
  effective_constraints: {
    company_stage: 'growth',
    budget_band: 'unknown',
    team_scale: 'unknown',
  },
};

describe('useStrategyLabReferencePreviews', () => {
  it('includes benchmark counts in preview string', () => {
    const { result } = renderHook(() =>
      useStrategyLabReferencePreviews({
        domainBenchmarks: { tech_infrastructure: {} as never },
        strategy,
      }),
    );
    expect(result.current.referencePreviewBenchmarks).toContain('1');
    expect(result.current.referencePreviewConstraints).not.toContain('{summary}');
  });
});
