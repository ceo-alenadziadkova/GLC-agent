/**
 * ADR §8 resolver composition map (single authority, multiple modules).
 *
 * `buildIntakePlan` call order: canon → policy eligibility ceiling → sequencing ordering →
 * layout projection → diagnostics (remediation + critical signals on the assembled plan).
 * Sequencing remains deterministic and does not invent UI-local branching; layout remains the
 * final surface projection authority. Readiness runs at API boundaries via
 * `intake-readiness-envelope`.
 */
import type { IntakeReadinessTraceEntry } from '../../audit-contract.js';
import { evaluateCriticalSignalsPilot } from '../evaluate-critical-signals.js';
import { selectRemediationPilotQueue } from '../evaluate-remediation-pilot.js';
import { applySequencingPilotToPlan } from './apply-sequencing-pilot.js';
import type { IntakePlan } from '../types.js';

export interface SequencingEvaluatorInput {
  sequencingVersion: string;
  nextRecommended: string[];
  visible: string[];
  responses: Record<string, unknown>;
}

export interface PlanDiagnosticsInput {
  plan: IntakePlan;
  responses: Record<string, unknown>;
}

export interface PlanDiagnosticsResult {
  criticalSignals: {
    satisfied: boolean;
    confidenceByKey: Record<string, import('../../audit-contract.js').IntakeCriticalSignalConfidence>;
    trace: IntakeReadinessTraceEntry[];
  };
  remediation: {
    queue: string[];
    trace: IntakeReadinessTraceEntry[];
  };
}

export function runSequencingEvaluator(input: SequencingEvaluatorInput) {
  return applySequencingPilotToPlan(input);
}

export function runPlanDiagnostics(input: PlanDiagnosticsInput): PlanDiagnosticsResult {
  const critical = evaluateCriticalSignalsPilot(input);
  const remediation = selectRemediationPilotQueue(input);
  return {
    criticalSignals: {
      satisfied: critical.satisfied,
      confidenceByKey: critical.confidenceByKey,
      trace: critical.trace,
    },
    remediation: {
      queue: remediation.queue,
      trace: remediation.trace,
    },
  };
}
