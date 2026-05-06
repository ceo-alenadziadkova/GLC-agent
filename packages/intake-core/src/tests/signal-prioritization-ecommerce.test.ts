import { describe, expect, it } from 'vitest';

import { computeSignalPrioritization } from '../core/signal-prioritization.js';

describe('computeSignalPrioritization ecommerce vertical', () => {
  it('elevates audit_focus to P0 for E-commerce industry label', () => {
    const confidenceByKey = {
      industry: 'medium' as const,
      website_presence: 'medium' as const,
      primary_problem: 'medium' as const,
      operations_bottleneck: 'medium' as const,
      audit_focus: 'low' as const,
    };
    const { bySignalKey } = computeSignalPrioritization({
      responses: { a2: 'E-commerce', f1: ['Growth'] },
      confidenceByKey,
    });
    expect(bySignalKey.audit_focus?.currentPriority).toBe('P0');
    expect(bySignalKey.audit_focus?.reason).toContain('ecommerce');
  });
});

describe('computeSignalPrioritization SaaS and Retail verticals', () => {
  const confidenceByKey = {
    industry: 'medium' as const,
    website_presence: 'medium' as const,
    primary_problem: 'medium' as const,
    operations_bottleneck: 'low' as const,
    audit_focus: 'low' as const,
  };

  it('elevates operations/audit focus for SaaS', () => {
    const { bySignalKey } = computeSignalPrioritization({
      responses: { a2: 'SaaS platform' },
      confidenceByKey,
    });
    expect(bySignalKey.operations_bottleneck?.currentPriority).toBe('P0');
    expect(bySignalKey.audit_focus?.currentPriority).toBe('P0');
  });

  it('elevates operations bottleneck for Retail', () => {
    const { bySignalKey } = computeSignalPrioritization({
      responses: { a2: 'Retail chain' },
      confidenceByKey,
    });
    expect(bySignalKey.operations_bottleneck?.currentPriority).toBe('P0');
  });
});
