import { describe, expect, it } from 'vitest';

import { isGlcOrchestrationPackView } from '../orchestration-pack-guards';

describe('isGlcOrchestrationPackView', () => {
  it('returns true for a minimal valid pack shape', () => {
    const raw = {
      version: 1,
      critical_path: ['a'],
      graph: { nodes: [], edges: [] },
      lanes: {},
    };
    expect(isGlcOrchestrationPackView(raw)).toBe(true);
  });

  it('returns false when required keys are missing', () => {
    expect(isGlcOrchestrationPackView(null)).toBe(false);
    expect(isGlcOrchestrationPackView({ version: 1 })).toBe(false);
    expect(isGlcOrchestrationPackView('x')).toBe(false);
  });
});
