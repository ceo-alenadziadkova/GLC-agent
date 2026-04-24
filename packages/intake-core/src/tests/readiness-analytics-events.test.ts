import { describe, expect, it } from 'vitest';

import { buildReadinessAnalyticsEvents } from '../core/diagnostic-intake/build-readiness-analytics-events.js';

describe('buildReadinessAnalyticsEvents', () => {
  it('emits blocked event when next audit readiness is blocked', () => {
    const events = buildReadinessAnalyticsEvents({
      previousFlowReadinessStatus: 'flow_ready',
      previousAuditReadinessStatus: 'audit_ready',
      nextFlowReadinessStatus: 'blocked',
      nextAuditReadinessStatus: 'blocked',
      reasonCode: 'critical_signal_unanswered',
    });
    expect(events.some(e => e.kind === 'intake_readiness_blocked')).toBe(true);
  });
});

