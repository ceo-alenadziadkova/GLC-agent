import { describe, expect, it } from 'vitest';

import { reorderNextRecommendedForSignalPriorityRespectingTiers } from '../core/reorder-next-recommended-for-signal-priority.js';
import type { IntakeQuestionStub } from '../types.js';

const recommendedStubs: IntakeQuestionStub[] = [
  { id: 'd2', priority: 'recommended' },
  { id: 'd_closing_flow', priority: 'recommended' },
  { id: 'f2', priority: 'recommended' },
];

const confidenceBaseline = {
  industry: 'high' as const,
  website_presence: 'high' as const,
  primary_problem: 'high' as const,
  operations_bottleneck: 'low' as const,
  audit_focus: 'high' as const,
  delivery_shape_baseline: 'low' as const,
};

describe('reorderNextRecommendedForSignalPriorityRespectingTiers', () => {
  it('keeps required banks before recommended when reordering by signal key', () => {
    const requiredStubs: IntakeQuestionStub[] = [
      { id: 'a1', priority: 'required' },
      { id: 'b1', priority: 'required' },
      ...recommendedStubs,
    ];
    const { nextRecommended } = reorderNextRecommendedForSignalPriorityRespectingTiers({
      nextRecommended: ['f2', 'a1', 'd2', 'b1', 'd_closing_flow'],
      responses: { a7: 'Scaling' },
      confidenceByKey: confidenceBaseline,
      stubs: requiredStubs,
    });
    const ia1 = nextRecommended.indexOf('a1');
    const if2 = nextRecommended.indexOf('f2');
    expect(ia1).toBeLessThan(if2);
  });

  it('ranks operations-related banks earlier under Scaling than under Launching within the recommended tier', () => {
    const list = ['f2', 'd_closing_flow', 'd2'];
    const launching = reorderNextRecommendedForSignalPriorityRespectingTiers({
      nextRecommended: list,
      responses: { a7: 'Launching' },
      confidenceByKey: confidenceBaseline,
      stubs: recommendedStubs,
    });
    const scaling = reorderNextRecommendedForSignalPriorityRespectingTiers({
      nextRecommended: list,
      responses: { a7: 'Scaling' },
      confidenceByKey: confidenceBaseline,
      stubs: recommendedStubs,
    });
    expect(scaling.nextRecommended.indexOf('d2')).toBeLessThan(launching.nextRecommended.indexOf('d2'));
  });
});
