import { describe, expect, it } from 'vitest';
import { operatorTriageReadinessTraceCodes } from '../core/readiness-trace-triage.js';

describe('operatorTriageReadinessTraceCodes', () => {
  it('keeps substantive block and scope codes, drops boilerplate', () => {
    const codes = operatorTriageReadinessTraceCodes([
      { code: 'hypothesis_formed', semanticCause: 'x' },
      { code: 'critical_signal_metadata_applied', semanticCause: 'm' },
      { code: 'signal_priority_evaluated', semanticCause: 'p' },
      { code: 'flow_readiness_not_enforced_at_point', semanticCause: 'e' },
      { code: 'flow_blocked_express_required', semanticCause: 'f' },
      { code: 'audit_blocked_full_sla', semanticCause: 'a' },
      { code: 'execution_plan_coverage_scope_active', semanticCause: 's' },
    ]);
    expect(codes).toEqual(['flow_blocked_express_required', 'audit_blocked_full_sla', 'execution_plan_coverage_scope_active']);
  });
});
