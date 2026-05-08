/**
 * Intake flow readiness defaults — keep aligned with `server/src/config/brief-validation-policy.ts`
 * (`preBriefSnapshotMinAnsweredRatio`) when that value changes.
 */
export const INTAKE_PRE_BRIEF_SNAPSHOT_MIN_ANSWERED_RATIO = 0.5;
/** ADR Phase-1 pilot scope cap: keep critical-signal registry intentionally small. */
export const INTAKE_PHASE1_MAX_CRITICAL_SIGNALS = 6;

export const INTAKE_UNKNOWN_SOURCE_VALUE = 'unknown' as const;

/**
 * ADR default safety rule for unknown answers:
 * - unknown may satisfy flow readiness
 * - unknown alone cannot satisfy audit readiness
 * - unknown cannot raise confidence above low
 */
export const INTAKE_UNKNOWN_POLICY = {
  unknownMaySatisfyFlowReadiness: true,
  unknownMaySatisfyAuditReadiness: false,
  maxConfidenceFromUnknown: 'low',
} as const;

export type IntakeSignalRegistryOwner = 'product' | 'engineering';
export type IntakeSignalConfidenceFloor = 'low' | 'medium' | 'high';

export interface IntakeSignalRegistryPolicyEntry {
  owner: IntakeSignalRegistryOwner;
  minimumConfidenceForAuditReady: IntakeSignalConfidenceFloor;
}

export const INTAKE_CRITICAL_SIGNAL_REGISTRY_POLICY: Record<string, IntakeSignalRegistryPolicyEntry> = {
  industry: { owner: 'product', minimumConfidenceForAuditReady: 'low' },
  website_presence: { owner: 'engineering', minimumConfidenceForAuditReady: 'low' },
  primary_problem: { owner: 'product', minimumConfidenceForAuditReady: 'low' },
  operations_bottleneck: { owner: 'product', minimumConfidenceForAuditReady: 'low' },
  audit_focus: { owner: 'product', minimumConfidenceForAuditReady: 'low' },
};
