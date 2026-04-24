import { describe, expect, it } from 'vitest';

import { buildProjectContextEnvelope } from '../core/diagnostic-intake/phase-bc-stubs.js';

describe('buildProjectContextEnvelope (Phase-B/C stub)', () => {
  it('materializes execution plan axis and readiness context for future ContextBuilder wiring', () => {
    const envelope = buildProjectContextEnvelope({
      responses: { a2: 'Healthcare', f1: 'x' },
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'audit_ready',
      criticalMissingKeys: ['website_presence'],
      executionPlan: 'pro',
    });
    expect(envelope.executionPlan).toBe('pro');
    expect(envelope.readinessContext.criticalMissingKeys).toEqual(['website_presence']);
    expect(envelope.identityContext.industry).toBe('Healthcare');
  });
});
