import { describe, expect, it } from 'vitest';

import { OrchestrationActionNodeListSchema } from '../schemas/orchestration-action-node.js';

describe('OrchestrationActionNodeListSchema', () => {
  it('accepts canonical normalized action nodes', () => {
    const parsed = OrchestrationActionNodeListSchema.parse([
      {
        id: 'director:tech:baseline:improve-ci',
        title: 'Improve CI throughput',
        domain: 'tech_infrastructure',
        lane: 'tech_delivery',
        dependencies: [],
        weight: 7,
        source: 'director',
        analysis_depth: 'baseline',
        confidence: 'high',
        impact_score: 4,
        effort_score: 2,
        risk_score: 2,
        blocking_factor: 1,
        time_to_value: 'fast',
      },
    ]);

    expect(parsed[0]?.id).toBe('director:tech:baseline:improve-ci');
  });

  it('accepts optional evidence_taxonomy counts', () => {
    const parsed = OrchestrationActionNodeListSchema.parse([
      {
        id: 'director:seo:deep:fix-meta',
        title: 'Fix meta descriptions',
        domain: 'seo_digital',
        lane: 'seo',
        dependencies: [],
        weight: 5,
        source: 'director',
        analysis_depth: 'deep',
        evidence_taxonomy: { observed: 2, derived: 1, assumed: 0, missing: 1 },
      },
    ]);
    expect(parsed[0]?.evidence_taxonomy).toEqual({
      observed: 2,
      derived: 1,
      assumed: 0,
      missing: 1,
    });
  });

  it('rejects nodes with unsupported lane ids', () => {
    const result = OrchestrationActionNodeListSchema.safeParse([
      {
        id: 'n1',
        title: 'Broken lane',
        domain: 'tech_infrastructure',
        lane: 'unknown_lane',
        dependencies: [],
        weight: 1,
      },
    ]);

    expect(result.success).toBe(false);
  });
});
