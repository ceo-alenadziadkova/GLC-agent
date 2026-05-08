import { describe, expect, it } from 'vitest';

import { computeStrategyJourneyStepStatuses } from '../strategy-journey-status';

describe('computeStrategyJourneyStepStatuses', () => {
  it('starts at context until constraints exist with execution domains', () => {
    const s = computeStrategyJourneyStepStatuses({
      effectiveConstraintsPresent: false,
      executionPlanDomainCount: 3,
      manifestSnapshotId: null,
      orchestrationPackVersion: 0,
    });
    expect(s.map((x) => x.id)).toEqual(['context', 'manifest', 'pack', 'plan']);
    expect(s[0]?.status).toBe('current');
    expect(s[1]?.status).toBe('pending');
  });

  it('moves manifest when constraints are present but snapshot missing', () => {
    const s = computeStrategyJourneyStepStatuses({
      effectiveConstraintsPresent: true,
      executionPlanDomainCount: 1,
      manifestSnapshotId: null,
      orchestrationPackVersion: 0,
    });
    expect(s[0]?.status).toBe('done');
    expect(s[1]?.status).toBe('current');
    expect(s[3]?.status).toBe('pending');
  });

  it('marks plan current when orchestration pack is built', () => {
    const s = computeStrategyJourneyStepStatuses({
      effectiveConstraintsPresent: true,
      executionPlanDomainCount: 1,
      manifestSnapshotId: 'snap-1',
      orchestrationPackVersion: 3,
    });
    expect(s.every((x, i) => (i < 3 ? x.status === 'done' : x.status === 'current'))).toBe(true);
  });
});
