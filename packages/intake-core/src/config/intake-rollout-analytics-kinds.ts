/**
 * Phase 6 — separate analytics event kinds for diagnostic intake (do not collapse into one score).
 */
export const INTAKE_DIAGNOSTIC_ANALYTICS_KINDS = [
  'intake_transition',
  'intake_signal_confidence_change',
  'intake_readiness_blocked',
  'intake_remediation_step',
  'intake_guard_triggered',
  'intelligence_metadata_incomplete',
] as const;

export type IntakeDiagnosticAnalyticsKind = (typeof INTAKE_DIAGNOSTIC_ANALYTICS_KINDS)[number];
