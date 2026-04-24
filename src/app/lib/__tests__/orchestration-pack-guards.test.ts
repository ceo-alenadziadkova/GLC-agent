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

  it('returns false when evidence_taxonomy is malformed', () => {
    const raw = {
      version: 1,
      critical_path: ['a'],
      graph: {
        nodes: [
          {
            id: 'a',
            title: 'T',
            domain: 'seo_digital',
            lane: 'seo',
            evidence_taxonomy: { observed: 1, derived: 'x', assumed: 0, missing: 0 },
          },
        ],
        edges: [],
      },
      lanes: { seo: ['a'], tech_delivery: [], product_change: [], marketing_narrative: [], processes_automation: [], risk_compliance: [] },
    };
    expect(isGlcOrchestrationPackView(raw)).toBe(false);
  });
});
