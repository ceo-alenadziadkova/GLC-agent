import { INTAKE_READINESS_PROGRESSIVE_CERTAINTY_TRACE_CODES } from '../audit-contract.js';

/**
 * Trace codes omitted from compact operator/support triage strings (HTTP `triage_blocking_trace_codes`, dashboards).
 *
 * Includes: progressive-certainty hypotheses, per-signal pilot boilerplate, and informational
 * enforcement-point markers that do not name the substantive block cause.
 */
export const READINESS_TRACE_CODES_EXCLUDED_FROM_OPERATOR_TRIAGE = [
  ...INTAKE_READINESS_PROGRESSIVE_CERTAINTY_TRACE_CODES,
  'critical_signal_metadata_applied',
  'signal_priority_evaluated',
  'flow_readiness_not_enforced_at_point',
  'audit_readiness_not_enforced_at_point',
] as const;

const excludedOperatorTriage = new Set<string>(READINESS_TRACE_CODES_EXCLUDED_FROM_OPERATOR_TRIAGE);

/**
 * Stable trace-code list for support when intake readiness blocks pipeline execution (start/next).
 */
export function operatorTriageReadinessTraceCodes(trace: readonly { code: string }[]): string[] {
  return trace.filter(entry => !excludedOperatorTriage.has(entry.code)).map(entry => entry.code);
}
