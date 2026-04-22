import { describe, expect, it } from 'vitest';

import { buildIntakePlan } from '../core/build-intake-plan.js';
import { currentIntakeVersionTuple } from '../core/versions.js';

describe('intelligence metadata fallback runtime', () => {
  it('does not crash when metadata is incomplete and emits diagnostic trace', () => {
    const plan = buildIntakePlan({
      responses: {
        a2: 'Professional Services',
      },
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
      intakeVersionTuple: currentIntakeVersionTuple(),
    });

    const fallbackTrace = plan.debugTrace?.filter(t => t.code === 'intelligence_metadata_incomplete') ?? [];
    expect(fallbackTrace.length).toBeGreaterThan(0);
    expect(plan.visible.length).toBeGreaterThan(0);
  });
});
