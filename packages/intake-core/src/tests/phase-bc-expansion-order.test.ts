import { describe, expect, it } from 'vitest';
import { isPhaseBcExpansionOrderValid } from '../core/diagnostic-intake/phase-bc-stubs.js';

describe('isPhaseBcExpansionOrderValid', () => {
  it('accepts ordered expansion steps', () => {
    expect(
      isPhaseBcExpansionOrderValid([
        'execution_plan_readiness',
        'signal_registry_metadata',
        'caveat_taxonomy',
      ]),
    ).toBe(true);
  });

  it('rejects out-of-order expansion steps', () => {
    expect(
      isPhaseBcExpansionOrderValid([
        'context_envelope',
        'execution_plan_readiness',
      ]),
    ).toBe(false);
  });
});
