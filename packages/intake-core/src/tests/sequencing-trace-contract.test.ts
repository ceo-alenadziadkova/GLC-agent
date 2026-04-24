import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('sequencing trace contract', () => {
  it('emits semantic transition trace entries (not only opaque ids)', () => {
    const plan = buildIntakePlan({
      responses: {
        a2: 'Healthcare',
        a5: 'Yes, multi-page site',
        f1: ['Too much manual work and operational overload'],
      },
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });

    const sequencingEntries = plan.debugTrace.filter(
      entry => entry.code.startsWith('sequencing_') || entry.code.startsWith('remediation_'),
    );
    expect(sequencingEntries.length).toBeGreaterThan(0);
    expect(sequencingEntries.every(entry => typeof entry.message === 'string' && entry.message.length > 8)).toBe(
      true,
    );
  });
});

