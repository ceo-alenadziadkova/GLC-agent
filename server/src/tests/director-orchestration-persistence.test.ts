import { describe, expect, it } from 'vitest';

import { mergeGlcDirectorOrchestrationSlices } from '../services/orchestration/director-orchestration-persistence.service.js';
import { GlcDirectorOrchestrationSliceSchema } from '../schemas/glc-director-orchestration-slice.js';

describe('mergeGlcDirectorOrchestrationSlices', () => {
  it('preserves baseline when a later write only carries deep', () => {
    const baselineOnly = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'b1',
            title: 'Baseline',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const deepOnly = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      deep: {
        actions: [
          {
            id: 'd1',
            title: 'Deep',
            impact: 5,
            effort: 2,
            risk: 2,
            urgency: 5,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const merged = mergeGlcDirectorOrchestrationSlices(baselineOnly, deepOnly);
    expect(merged.baseline?.actions).toHaveLength(1);
    expect(merged.deep?.actions).toHaveLength(1);
    expect(GlcDirectorOrchestrationSliceSchema.safeParse(merged).success).toBe(true);
  });

  it('preserves deep when a later write only refreshes baseline', () => {
    const first = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'b1',
            title: 'B',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
      deep: {
        actions: [
          {
            id: 'd1',
            title: 'D',
            impact: 5,
            effort: 2,
            risk: 2,
            urgency: 5,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const baselineRefresh = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'b2',
            title: 'B2',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const merged = mergeGlcDirectorOrchestrationSlices(first, baselineRefresh);
    expect(merged.baseline?.actions?.[0]?.id).toBe('b2');
    expect(merged.deep?.actions?.[0]?.id).toBe('d1');
  });
});
