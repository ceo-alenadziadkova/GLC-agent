import { describe, expect, it } from 'vitest';

import { coerceOrchestrationPlanGovernance } from '../orchestration-plan-governance-guard';

describe('coerceOrchestrationPlanGovernance', () => {
  it('returns null for non-objects', () => {
    expect(coerceOrchestrationPlanGovernance(null)).toBeNull();
    expect(coerceOrchestrationPlanGovernance(undefined)).toBeNull();
    expect(coerceOrchestrationPlanGovernance('x')).toBeNull();
  });

  it('returns null when governance row missing required shape', () => {
    expect(coerceOrchestrationPlanGovernance({ plan_governance: { unresolved_conflicts: 1 } })).toBeNull();
  });

  it('parses attach-style governance payloads', () => {
    const pg = coerceOrchestrationPlanGovernance({
      plan_governance: {
        status: 'fail',
        decision: 'reject',
        unresolved_conflicts: 0,
      },
    });
    expect(pg?.status).toBe('fail');
    expect(pg?.decision).toBe('reject');
  });

  it('returns null when status or decision are not DTO enum values', () => {
    expect(
      coerceOrchestrationPlanGovernance({
        plan_governance: { status: 'unknown', decision: 'reject' },
      }),
    ).toBeNull();
    expect(
      coerceOrchestrationPlanGovernance({
        plan_governance: { status: 'pass', decision: 'maybe' },
      }),
    ).toBeNull();
  });
});
