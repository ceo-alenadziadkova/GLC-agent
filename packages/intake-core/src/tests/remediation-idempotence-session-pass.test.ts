import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

function remediationQueue(responses: Record<string, unknown>): string[] {
  const plan = buildIntakePlan({
    responses,
    productMode: 'full',
    collectionMode: 'self_serve',
    surface: 'client_form',
    intakeVersionTuple: currentIntakeVersionTuple(),
  });
  return plan.remediation?.queue ?? [];
}

describe('remediation idempotence in one self-serve pass', () => {
  it('does not re-open already answered remediation signal after partial progress', () => {
    const start = remediationQueue({
      a2: 'Healthcare',
      a5: 'Yes, multi-page site',
      a1: 'Clinic',
    });
    expect(start.length).toBeGreaterThan(0);

    const answeredOne = remediationQueue({
      a2: 'Healthcare',
      a5: 'Yes, multi-page site',
      a1: 'Clinic',
      [start[0]]: 'answered',
    });

    expect(answeredOne.includes(start[0]!)).toBe(false);

    const answeredOneRecalc = remediationQueue({
      a2: 'Healthcare',
      a5: 'Yes, multi-page site',
      a1: 'Clinic',
      [start[0]]: 'answered',
    });
    expect(answeredOneRecalc).toEqual(answeredOne);
  });
});

