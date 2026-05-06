import { describe, expect, it } from 'vitest';
import { buildPipelineIntakeReadinessBlockedDetails, triageBlockingIntakeTraceCodes } from '../intake-readiness-error-details.js';

describe('intake-readiness-error-details', () => {
  it('omits progressive certainty codes from triage list', () => {
    const envelope = {
      flowReadinessStatus: 'flow_ready' as const,
      auditReadinessStatus: 'blocked' as const,
      trace: [
        { code: 'hypothesis_formed' as const, semanticCause: 'x' },
        { code: 'audit_blocked_full_sla' as const, semanticCause: 'sla' },
        { code: 'hypothesis_confirmed' as const, semanticCause: 'y' },
      ],
    };
    expect(triageBlockingIntakeTraceCodes(envelope)).toEqual(['audit_blocked_full_sla']);
    expect(buildPipelineIntakeReadinessBlockedDetails(envelope).triage_blocking_trace_codes).toEqual([
      'audit_blocked_full_sla',
    ]);
  });

  it('omits per-signal pilot boilerplate from triage list', () => {
    const envelope = {
      flowReadinessStatus: 'flow_ready' as const,
      auditReadinessStatus: 'blocked' as const,
      trace: [
        { code: 'critical_signal_metadata_applied', semanticCause: 'm' },
        { code: 'signal_priority_evaluated', semanticCause: 'p' },
        { code: 'audit_blocked_full_sla', semanticCause: 'sla' },
      ],
    };
    expect(triageBlockingIntakeTraceCodes(envelope)).toEqual(['audit_blocked_full_sla']);
  });
});
