import { describe, expect, it } from 'vitest';

import { computeOrchestrationPriorityScore } from '../services/orchestration/orchestration-priority-engine.js';

describe('computeOrchestrationPriorityScore', () => {
  it('gives higher score for stronger leverage and lower penalties', () => {
    const highLeverage = computeOrchestrationPriorityScore({
      id: 'n1',
      title: 'N1',
      domain: 'tech_infrastructure',
      lane: 'tech_delivery',
      dependencies: [],
      weight: 1,
      impact_score: 5,
      effort_score: 1,
      risk_score: 1,
      confidence: 'high',
      domain_weight: 2,
      blocking_factor: 3,
      time_to_value: 'fast',
    });
    const lowLeverage = computeOrchestrationPriorityScore({
      id: 'n2',
      title: 'N2',
      domain: 'tech_infrastructure',
      lane: 'tech_delivery',
      dependencies: [],
      weight: 1,
      impact_score: 2,
      effort_score: 4,
      risk_score: 4,
      confidence: 'low',
      domain_weight: 0.5,
      blocking_factor: 0,
      time_to_value: 'slow',
    });
    expect(highLeverage).toBeGreaterThan(lowLeverage);
  });
});
