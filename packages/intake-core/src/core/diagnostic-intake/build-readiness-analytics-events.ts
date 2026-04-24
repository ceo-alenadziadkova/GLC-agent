import type { AuditReadinessStatus, FlowReadinessStatus } from '../../audit-contract.js';
import type { IntakeDiagnosticAnalyticsKind } from '../../config/intake-rollout-analytics-kinds.js';

export interface IntakeReadinessAnalyticsEvent {
  kind: IntakeDiagnosticAnalyticsKind;
  flowReadinessStatus: FlowReadinessStatus;
  auditReadinessStatus: AuditReadinessStatus;
  reasonCode?: string;
}

export function buildReadinessAnalyticsEvents(input: {
  previousFlowReadinessStatus?: FlowReadinessStatus;
  previousAuditReadinessStatus?: AuditReadinessStatus;
  nextFlowReadinessStatus: FlowReadinessStatus;
  nextAuditReadinessStatus: AuditReadinessStatus;
  reasonCode?: string;
}): IntakeReadinessAnalyticsEvent[] {
  const events: IntakeReadinessAnalyticsEvent[] = [];
  if (
    input.previousFlowReadinessStatus !== input.nextFlowReadinessStatus
    || input.previousAuditReadinessStatus !== input.nextAuditReadinessStatus
  ) {
    events.push({
      kind: 'intake_signal_confidence_change',
      flowReadinessStatus: input.nextFlowReadinessStatus,
      auditReadinessStatus: input.nextAuditReadinessStatus,
      reasonCode: input.reasonCode,
    });
  }
  if (input.nextAuditReadinessStatus === 'blocked') {
    events.push({
      kind: 'intake_readiness_blocked',
      flowReadinessStatus: input.nextFlowReadinessStatus,
      auditReadinessStatus: input.nextAuditReadinessStatus,
      reasonCode: input.reasonCode,
    });
  }
  return events;
}

