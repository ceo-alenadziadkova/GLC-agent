/**
 * ADR Diagnostic Adaptive Intake — single readiness authority for API enforcement points.
 * UX metrics (`confidence_overall`, AI readiness) stay separate from this contract (ADR §3.2).
 */
import type {
  AuditReadinessStatus,
  DomainKey,
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
import { INTAKE_READINESS_CAVEAT_TAXONOMY } from '../config/intake-caveat-taxonomy.js';
import { evaluateCriticalSignalsPilot } from './evaluate-critical-signals.js';
import {
  filterMissingDomainsForExecutionPlan,
  unansweredPrimaryBankIdsForCoverageDomains,
} from './intake-readiness-execution-scope.js';
import { evaluateFlowReadinessBlocked, missingRequiredForMode } from './intake-readiness-sla-helpers.js';
import type { IntakeSurface } from './types.js';
import { isSurfaceReadinessEnforcedAt, type SurfaceMatrixEnforcementPoint } from './load-surface-matrix-pilot.js';
import { deriveSignalPrioritization } from './signal-prioritization.js';

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
  /**
   * When true with non-empty `executionSelectedDomains`, `evaluateExecutionPlanScopeReadiness` uses
   * coverage gaps (`missingForReport` ∩ execution slice) instead of SLA missing-id lists alone.
   */
  applyExecutionPlanCoverageScope?: boolean;
  /** Domains selected for pipeline execution (`audit.execution_plan.selected_domains`). */
  executionSelectedDomains?: readonly DomainKey[];
  /** Whether strategy phase is in scope (`audit.execution_plan.include_strategy`). */
  executionIncludeStrategy?: boolean;
  /** Runtime boundary where readiness is being evaluated. */
  enforcementPoint?: SurfaceMatrixEnforcementPoint;
}

export function evaluateIntakeReadinessEnvelope(input: EvaluateIntakeReadinessInput): IntakeReadinessEnvelope {
  const trace: IntakeReadinessTraceEntry[] = [];
  const {
    responses,
    slaProductMode,
    collectionMode,
    surface,
    intakeVersionTuple,
    criticalSignalsMode,
    applyExecutionPlanCoverageScope,
    executionSelectedDomains,
    executionIncludeStrategy,
  } = input;
  const critMode = criticalSignalsMode ?? 'full';
  const enforcementPoint = input.enforcementPoint ?? 'pipeline_start';

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

  const flowEnforced = isSurfaceReadinessEnforcedAt({
    collectionMode,
    surface,
    point: enforcementPoint,
    kind: 'flow',
  });
  const { flowBlocked, traces: flowTraces } = evaluateFlowReadinessBlocked({
    responses,
    collectionMode,
    surface,
    intakeVersionTuple: tuple,
  });
  trace.push(...flowTraces);
  if (!flowEnforced) {
    trace.push({
      code: 'flow_readiness_not_enforced_at_point',
      semanticCause:
        'Flow readiness is not enforced at this boundary for the current surface policy; returning flow_ready for this checkpoint',
      detail: { enforcementPoint },
    });
  }

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
          confidenceByKey: {},
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

  const auditEnforced = isSurfaceReadinessEnforcedAt({
    collectionMode,
    surface,
    point: enforcementPoint,
    kind: 'audit',
  });
  const auditBlocked = auditBlockedBySla || !critical.satisfied;

  const useExecutionCoverageScope =
    applyExecutionPlanCoverageScope === true
    && Array.isArray(executionSelectedDomains)
    && executionSelectedDomains.length > 0;

  let inScopeMissingSignals: string[];
  let outOfScopeMissingSignals: string[];
  if (useExecutionCoverageScope) {
    const scopedDomains = filterMissingDomainsForExecutionPlan({
      missingForReport: fullPlan.missingForReport,
      executionSelectedDomains,
      executionIncludeStrategy: executionIncludeStrategy ?? false,
    });
    inScopeMissingSignals = unansweredPrimaryBankIdsForCoverageDomains({
      domains: scopedDomains,
      slaVisibleBankIds: fullPlan.slaVisibleBankIds,
      responses,
    });
    const scopedSet = new Set(scopedDomains);
    const outDomains = fullPlan.missingForReport.filter(d => !scopedSet.has(d));
    outOfScopeMissingSignals = unansweredPrimaryBankIdsForCoverageDomains({
      domains: outDomains,
      slaVisibleBankIds: fullPlan.slaVisibleBankIds,
      responses,
    });
    trace.push({
      code: 'execution_plan_coverage_scope_active',
      semanticCause:
        'Execution-plan coverage scope is active: in-scope gaps are derived from missing report domains intersected with selected pipeline domains',
      detail: {
        scopedDomains,
        inScopeMissingBankIds: inScopeMissingSignals,
        outOfScopeMissingBankIds: outOfScopeMissingSignals,
      },
    });
  } else {
    inScopeMissingSignals = slaProductMode === INTAKE_SLA_FULL ? missingFull : missingExpress;
    outOfScopeMissingSignals =
      slaProductMode === INTAKE_SLA_FULL ? [] : missingFull.filter(id => !missingExpress.includes(id));
  }

  const packageReadiness = evaluateExecutionPlanScopeReadiness({
    packageName: input.executionCoveragePackage ?? 'complete',
    baselineReady: !auditBlocked,
    inScopeMissingSignals,
    outOfScopeMissingSignals,
    policy: INTAKE_EXECUTION_PLAN_READINESS_POLICY,
  });
  const executionScopeBlocked = !packageReadiness.ready && packageReadiness.blockedBy === 'in_scope_gaps';
  if (executionScopeBlocked) {
    trace.push({
      code: 'audit_blocked_execution_scope',
      semanticCause: 'Execution-plan in-scope readiness requirements are not satisfied',
    });
  }

  const flowReadinessStatus: FlowReadinessStatus = flowEnforced && flowBlocked ? 'blocked' : 'flow_ready';
  let auditReadinessStatus: AuditReadinessStatus =
    auditEnforced && !packageReadiness.ready ? 'blocked' : 'audit_ready';
  const caveats: IntakeReadinessCaveatClass[] = [];
  const pushCaveat = (caveat: IntakeReadinessCaveatClass) => {
    if (!caveats.includes(caveat)) caveats.push(caveat);
  };
  if (executionScopeBlocked) {
    pushCaveat('execution_scope_missing_signals');
  }

  if (packageReadiness.ready && slaProductMode === 'express' && missingFull.length > 0) {
    auditReadinessStatus = 'ready_with_caveats';
    pushCaveat('full_scope_required_gaps');
    trace.push({
      code: 'audit_ready_with_caveats_full_scope',
      semanticCause:
        'Express baseline readiness is satisfied, but full-scope required inputs are still missing',
      detail: { missingRequiredIds: missingFull },
    });
  }

  if (!auditEnforced) {
    trace.push({
      code: 'audit_readiness_not_enforced_at_point',
      semanticCause:
        'Audit readiness is not enforced at this boundary for the current surface policy; readiness is advisory only at this checkpoint',
      detail: { enforcementPoint },
    });
    if (auditBlockedBySla || !critical.satisfied) {
      auditReadinessStatus = 'ready_with_caveats';
      pushCaveat('surface_limited_context');
      if (!critical.satisfied) {
        pushCaveat('critical_signal_low_confidence');
      }
      if (trace.some(entry => entry.code === 'critical_signal_unknown_source')) {
        pushCaveat('unknown_source_signal_evidence');
      }
    }
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

  const signalPrioritization =
    critMode === 'full'
      ? deriveSignalPrioritization({
          responses,
          confidenceByKey: critical.confidenceByKey ?? {},
          trace,
        })
      : undefined;

  return {
    flowReadinessStatus,
    auditReadinessStatus,
    caveats: caveats.length > 0 ? caveats.slice(0, 3) : undefined,
    caveatDetails:
      caveats.length > 0
        ? caveats
            .slice(0, 3)
            .map(code => ({ code, ...INTAKE_READINESS_CAVEAT_TAXONOMY[code] }))
        : undefined,
    ...(signalPrioritization ? { signalPrioritization } : {}),
    trace,
  };
}
