import { describe, expect, it } from 'vitest';

import roadmap from '../artifacts/intake-vertical-expansion-roadmap.v1.json' with { type: 'json' };

interface VerticalExpansionRoadmap {
  version: string;
  orderedVerticals: Array<{
    key: string;
    label: string;
    status: 'planned' | 'active' | 'completed';
    diagnosticDepthProbes: string[];
  }>;
}

describe('intake vertical expansion roadmap', () => {
  it('keeps the canonical post-KPI expansion order', () => {
    const parsed = roadmap as VerticalExpansionRoadmap;
    expect(parsed.orderedVerticals.map(v => v.key)).toEqual([
      'ecommerce',
      'saas_software',
      'retail',
    ]);
  });

  it('requires at least three diagnostic probes per vertical', () => {
    const parsed = roadmap as VerticalExpansionRoadmap;
    for (const vertical of parsed.orderedVerticals) {
      expect(vertical.diagnosticDepthProbes.length).toBeGreaterThanOrEqual(3);
    }
  });
});
