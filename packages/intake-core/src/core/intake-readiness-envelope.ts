/**
 * ADR Diagnostic Adaptive Intake — single readiness authority for API enforcement points.
 * UX metrics (`confidence_overall`, AI readiness) stay separate from this contract (ADR §3.2).
 */
import type {
  AuditReadinessStatus,
  FlowReadinessStatus,
  IntakeBriefCollectionMode,
  IntakeReadinessCaveatClass,
  IntakeReadinessEnvelope,
  IntakeReadinessTraceEntry,
  IntakeVersionTuple,
  ProductMode,
} from '../audit-contract.js';
import { buildIntakePlan } from './build-intake-plan.js';
import { INTAKE_EXECUTION_PLAN_READINESS_POLICY } from '../config/intake-execution-plan-readiness.js';
import {
  evaluateExecutionPlanScopeReadiness,
  type ExecutionCoveragePackage,
} from './diagnostic-intake/phase-bc-stubs.js';
import { evaluateCriticalSignalsPilot } from './evaluate-critical-signals.js';
import { evaluateFlowReadinessBlocked, missingRequiredForMode } from './intake-readiness-sla-helpers.js';
import type { IntakeSurface } from './types.js';

const INTAKE_SLA_FULL: ProductMode = 'full';

export type IntakeReadinessCriticalSignalsMode = 'full' | 'sla_only';

export interface EvaluateIntakeReadinessInput {
  responses: Record<string, unknown>;
  /**
   * Product mode used for SLA-style required sets (matches server `evaluateBriefGates`):
   * paid full audits use `'full'`; express path uses `'express'`.
   */
  slaProductMode: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
  intakeVersionTuple?: IntakeVersionTuple | null;
  /**
   * `sla_only` skips pilot critical-signal registry (e.g. discovery→audit seed where many cells are `unknown`).
   * Pipeline start and normal brief recompute use `full` (default).
   */
  criticalSignalsMode?: IntakeReadinessCriticalSignalsMode;
  /** Phase-B optional execution-plan scope signal. */
  executionCoveragePackage?: ExecutionCoveragePackage;
}

export function evaluateIntakeReadinessEnvelope(input: EvaluateIntakeReadinessInput): IntakeReadinessEnvelope {
  const trace: IntakeReadinessTraceEntry[] = [];
  const { responses, slaProductMode, collectionMode, surface, intakeVersionTuple, criticalSignalsMode } = input;
  const critMode = criticalSignalsMode ?? 'full';

  if (slaProductMode === 'free_snapshot') {
    trace.push({
      code: 'readiness_skipped_free_snapshot',
      semanticCause: 'Free snapshot audits do not use paid audit execution readiness gates',
    });
    return {
      flowReadinessStatus: 'flow_ready',
      auditReadinessStatus: 'audit_ready',
      trace,
    };
  }

  const tuple = intakeVersionTuple ?? undefined;

  const { flowBlocked, traces: flowTraces } = evaluateFlowReadinessBlocked({
    responses,
    collectionMode,
    surface,
    intakeVersionTuple: tuple,
  });
  trace.push(...flowTraces);

  const missingFull = missingRequiredForMode(responses, INTAKE_SLA_FULL, collectionMode, surface, tuple);
  const missingExpress = missingRequiredForMode(responses, 'express', collectionMode, surface, tuple);

  const fullPlan = buildIntakePlan({
    responses,
    productMode: INTAKE_SLA_FULL,
    collectionMode,
    surface,
    intakeVersionTuple: tuple,
  });

  const critical =
    critMode === 'sla_only'
      ? {
          satisfied: true,
          trace: [
            {
              code: 'pilot_critical_signals_skipped',
              semanticCause:
                'Pilot critical-signal registry skipped for this enforcement context (SLA-only gate)',
            },
          ],
        }
      : evaluateCriticalSignalsPilot({ responses, plan: fullPlan });
  trace.push(...critical.trace);

  const auditBlockedBySla =
    slaProductMode === INTAKE_SLA_FULL ? missingFull.length > 0 : missingExpress.length > 0;

  if (slaProductMode === INTAKE_SLA_FULL && missingFull.length > 0) {
    trace.push({
      code: 'audit_blocked_full_sla',
      semanticCause: 'Full product mode requires every SLA-visible required bank question before audit execution',
      detail: { missingRequiredIds: missingFull },
    });
  } else if (slaProductMode !== INTAKE_SLA_FULL && missingExpress.length > 0) {
    trace.push({
      code: 'audit_blocked_express_sla',
      semanticCause: 'Express-mode audits require express SLA completion before pipeline execution',
      detail: { missingRequiredIds: missingExpress },
    });
  }

  const auditBlocked = auditBlockedBySla || !critical.satisfied;
  const packageReadiness = evaluateExecutionPlanScopeReadiness({
    packageName: input.executionCoveragePackage ?? 'complete',
    baselineReady: !auditBlocked,
    inScopeMissingSignals: slaProductMode === 'full' ? missingFull : missingExpress,
    outOfScopeMissingSignals: slaProductMode === 'full' ? [] : missingFull.filter(id => !missingExpress.includes(id)),
    policy: INTAKE_EXECUTION_PLAN_READINESS_POLICY,
  });
  if (!packageReadiness.ready && packageReadiness.blockedBy === 'in_scope_gaps') {
    trace.push({
      code: 'audit_blocked_execution_scope',
      semanticCause: 'Execution-plan in-scope readiness requirements are not satisfied',
    });
  }

  const flowReadinessStatus: FlowReadinessStatus = flowBlocked ? 'blocked' : 'flow_ready';
  let auditReadinessStatus: AuditReadinessStatus = packageReadiness.ready ? 'audit_ready' : 'blocked';
  const caveats: IntakeReadinessCaveatClass[] = [];

  if (packageReadiness.ready && slaProductMode === 'express' && missingFull.length > 0) {
    auditReadinessStatus = 'ready_with_caveats';
    caveats.push('full_scope_required_gaps');
    trace.push({
      code: 'audit_ready_with_caveats_full_scope',
      semanticCause:
        'Express baseline readiness is satisfied, but full-scope required inputs are still missing',
      detail: { missingRequiredIds: missingFull },
    });
  }

  if (packageReadiness.ready && critical.satisfied) {
    trace.push({
      code: 'audit_ready_baseline',
      semanticCause:
        slaProductMode === INTAKE_SLA_FULL
          ? 'Full SLA satisfied and pilot critical signals present with non-unknown evidence where required'
          : 'Express SLA satisfied and pilot critical signals present with non-unknown evidence where required',
    });
  }

  return {
    flowReadinessStatus,
    auditReadinessStatus,
    caveats: caveats.length > 0 ? caveats.slice(0, 3) : undefined,
    trace,
  };
}
