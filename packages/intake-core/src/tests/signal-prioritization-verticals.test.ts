import { describe, expect, it } from 'vitest';

import { computeSignalPrioritization } from '../core/signal-prioritization.js';

describe('computeSignalPrioritization vertical expansion', () => {
  it('elevates SaaS signals to P0', () => {
    const result = computeSignalPrioritization({
      responses: {
        a2: 'SaaS',
        a7: 'Growing fast',
      },
      confidenceByKey: {
        audit_focus: 'medium',
        operations_bottleneck: 'medium',
      },
    });

    expect(result.bySignalKey.audit_focus?.currentPriority).toBe('P0');
    expect(result.bySignalKey.operations_bottleneck?.currentPriority).toBe('P0');
  });

  it('elevates Retail operational delivery signals to P0', () => {
    const result = computeSignalPrioritization({
      responses: {
        a2: 'Retail',
        a7: 'Scaling',
      },
      confidenceByKey: {
        operations_bottleneck: 'medium',
        delivery_shape_baseline: 'medium',
      },
    });

    expect(result.bySignalKey.operations_bottleneck?.currentPriority).toBe('P0');
    expect(result.bySignalKey.delivery_shape_baseline?.currentPriority).toBe('P0');
  });
});
