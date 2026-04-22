import type { IntakeCriticalSignalConfidence, IntakeReadinessTraceEntry } from '../audit-contract.js';
import type { IntakeBriefCollectionMode } from '../audit-contract.js';
import { runPlanDiagnostics } from './intake-plan/resolver-pipeline.js';
import type { IntakePlan, IntakeSurface } from './types.js';

export interface IntakePlanCriticalSignalsBlock {
  satisfied: boolean;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  trace: IntakeReadinessTraceEntry[];
}

export interface IntakePlanRemediationBlock {
  queue: string[];
  trace: IntakeReadinessTraceEntry[];
}

/**
 * Post-plan diagnostics: critical signal confidence + pilot remediation queue (ADR composition root).
 */
export function assembleIntakePlanDiagnostics(args: {
  plan: IntakePlan;
  responses: Record<string, unknown>;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
}): { criticalSignals: IntakePlanCriticalSignalsBlock; remediation: IntakePlanRemediationBlock } {
  const { criticalSignals, remediation } = runPlanDiagnostics(args);
  return {
    criticalSignals: {
      satisfied: criticalSignals.satisfied,
      confidenceByKey: criticalSignals.confidenceByKey,
      trace: criticalSignals.trace,
    },
    remediation: {
      queue: remediation.queue,
      trace: remediation.trace,
    },
  };
}
