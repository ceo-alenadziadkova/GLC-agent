import { describe, expect, it } from 'vitest';

import { INTAKE_EXECUTION_PLAN_READINESS_POLICY } from '../config/intake-execution-plan-readiness.js';
import { evaluateExecutionPlanScopeReadiness } from '../core/diagnostic-intake/phase-bc-stubs.js';

const scopeAwarePolicy = {
  starter: 'scope_aware',
  pro: 'scope_aware',
  complete: 'scope_aware',
} as const;

describe('execution-plan-aware readiness', () => {
  it('does not block starter package because of out-of-scope gaps', () => {
    const res = evaluateExecutionPlanScopeReadiness({
      packageName: 'starter',
      baselineReady: true,
      outOfScopeMissingSignals: ['marketing_specific_signal'],
      inScopeMissingSignals: [],
      policy: scopeAwarePolicy,
    });
    expect(res.ready).toBe(true);
    expect(res.blockedBy).toBeNull();
  });

  it('blocks when in-scope gaps exist under scope-aware policy', () => {
    const res = evaluateExecutionPlanScopeReadiness({
      packageName: 'pro',
      baselineReady: true,
      outOfScopeMissingSignals: ['out_of_scope'],
      inScopeMissingSignals: ['automation_process_shape'],
      policy: scopeAwarePolicy,
    });
    expect(res.ready).toBe(false);
    expect(res.blockedBy).toBe('in_scope_gaps');
  });

  it('does not block complete package on in-scope gaps when product policy is baseline_only', () => {
    const res = evaluateExecutionPlanScopeReadiness({
      packageName: 'complete',
      baselineReady: true,
      outOfScopeMissingSignals: ['out_of_scope'],
      inScopeMissingSignals: ['a8', 'b4'],
      policy: INTAKE_EXECUTION_PLAN_READINESS_POLICY,
    });
    expect(res.ready).toBe(true);
    expect(res.blockedBy).toBeNull();
  });
});

