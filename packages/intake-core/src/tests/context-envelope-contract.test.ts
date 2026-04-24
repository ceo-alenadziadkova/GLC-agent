import { describe, expect, it } from 'vitest';

import { buildProjectContextEnvelope } from '../core/diagnostic-intake/phase-bc-stubs.js';

describe('project context envelope contract', () => {
  it('builds normalized envelope with explicit and unknown evidence buckets', () => {
    const envelope = buildProjectContextEnvelope({
      responses: {
        a2: 'Healthcare',
        a5: 'No website yet',
        f1: ['Too much manual work and operational overload'],
        d2: { value: 'Scheduling and confirming appointments', source: 'unknown' },
      },
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'blocked',
      criticalMissingKeys: ['audit_focus'],
      executionPlan: 'starter',
    });

    expect(envelope.identityContext.industry).toBe('Healthcare');
    expect(envelope.readinessContext.auditReadinessStatus).toBe('blocked');
    expect(envelope.readinessContext.criticalMissingKeys).toContain('audit_focus');
    expect(envelope.evidenceContext.unknownKeys).toContain('d2');
    expect(envelope.executionPlan).toBe('starter');
  });
});

