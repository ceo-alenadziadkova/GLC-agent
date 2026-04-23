/**
 * ADR Diagnostic Adaptive Intake — single readiness authority for API enforcement points.
 * UX metrics (`confidence_overall`, AI readiness) stay separate from this contract (ADR §3.2).
 */
import type {
  AuditReadinessStatus,
  DomainKey,
  FlowReadinessStatus,
  IntakeBriefCollectionMode,
  IntakeCriticalSignalConfidence,
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

const PILOT_BANK_TO_SIGNAL: Record<string, string> = {
  a2: 'industry',
  a5: 'website_presence',
  f1: 'primary_problem',
  f2: 'audit_focus',
  d2: 'operations_bottleneck',
  d_closing_flow: 'delivery_shape_baseline',
};

/** Confidence band at which we treat pilot evidence as sufficient to close uncertainty without a second source. */
const UNCERTAINTY_CLOSED_CONFIDENCE_TARGET: IntakeCriticalSignalConfidence[] = ['high', 'medium'];
const SOURCE_PRIORITY: Record<string, number> = {
  recon_confirmed: 5,
  consultant_prefill: 4,
  client: 3,
  imported: 2,
  inferred: 1,
  unknown: 0,
};

function normalizeIntakeAnswerForCrossCheck(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.toLowerCase().trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
  if (Array.isArray(value)) {
    return [...value]
      .map(item => normalizeIntakeAnswerForCrossCheck(item))
      .filter(Boolean)
      .sort()
      .join('|');
  }
  return '';
}

function appendProgressiveCertaintyHypothesisTrace(args: {
  responses: Record<string, unknown>;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  trace: IntakeReadinessTraceEntry[];
  hypothesisCrossCheckByQuestionId?: Record<
    string,
    { value: unknown; source?: 'recon_confirmed' | 'consultant_prefill' | 'imported' }
  >;
}): void {
  const emittedSignals = new Set<string>();
  for (const [questionId, signalKey] of Object.entries(PILOT_BANK_TO_SIGNAL)) {
    const raw = args.responses[questionId];
    const answered =
      raw !== undefined &&
      raw !== null &&
      !(typeof raw === 'string' && raw.trim() === '') &&
      !(Array.isArray(raw) && raw.length === 0);
    if (!answered) continue;
    if (emittedSignals.has(signalKey)) continue;
    emittedSignals.add(signalKey);
    const conf = args.confidenceByKey[signalKey] ?? 'unknown';
    const cross = args.hypothesisCrossCheckByQuestionId?.[questionId];
    const primaryNorm = normalizeIntakeAnswerForCrossCheck(raw);
    const crossNorm = cross ? normalizeIntakeAnswerForCrossCheck(cross.value) : '';

    if (crossNorm.length > 0 && primaryNorm.length > 0 && crossNorm !== primaryNorm) {
      args.trace.push({
        code: 'hypothesis_disconfirmed',
        semanticCause: `Cross-source value disagrees with structured answer for pilot signal "${signalKey}" on ${questionId}`,
        questionId,
        signalKey,
        detail: {
          confidence: conf,
          crossCheckSource: cross?.source ?? 'unknown',
        },
      });
      continue;
    }

    if (
      crossNorm.length > 0 &&
      primaryNorm.length > 0 &&
      crossNorm === primaryNorm &&
      !UNCERTAINTY_CLOSED_CONFIDENCE_TARGET.includes(conf)
    ) {
      args.trace.push({
        code: 'hypothesis_confirmed',
        semanticCause: `Second source agrees with structured answer for pilot signal "${signalKey}" on ${questionId}`,
        questionId,
        signalKey,
        detail: {
          confidence: conf,
          crossCheckSource: cross?.source ?? 'unknown',
        },
      });
      continue;
    }

    if (UNCERTAINTY_CLOSED_CONFIDENCE_TARGET.includes(conf)) {
      args.trace.push({
        code: 'uncertainty_closed',
        semanticCause: `Pilot signal "${signalKey}" reached confident state after structured answer on ${questionId}`,
        questionId,
        signalKey,
      });
    } else {
      args.trace.push({
        code: 'hypothesis_formed',
        semanticCause: `Structured answer on ${questionId} anchors hypothesis for pilot signal "${signalKey}"`,
        questionId,
        signalKey,
        detail: { confidence: conf },
      });
    }
  }
}

export function resolveSignalFromSources<T>(sources: Array<{ source: string; value: T }>): {
  selected: { source: string; value: T } | null;
  conflict: boolean;
} {
  if (sources.length === 0) return { selected: null, conflict: false };
  const sorted = [...sources].sort(
    (a, b) => (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0),
  );
  const selected = sorted[0] ?? null;
  if (!selected) return { selected: null, conflict: false };
  const selectedNormalized = normalizeIntakeAnswerForCrossCheck(selected.value);
  const conflict = sorted
    .slice(1)
    .some(item => normalizeIntakeAnswerForCrossCheck(item.value) !== selectedNormalized);
  return { selected, conflict };
}

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
  /**
   * Optional echo from recon/consultant/import for the same bank id. When it disagrees with the
   * respondent `responses` value, emits `hypothesis_disconfirmed`; when it agrees and confidence
   * is still below `UNCERTAINTY_CLOSED_CONFIDENCE_TARGET`, emits `hypothesis_confirmed`.
   */
  hypothesisCrossCheckByQuestionId?: Record<
    string,
    { value: unknown; source?: 'recon_confirmed' | 'consultant_prefill' | 'imported' }
  >;
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
    hypothesisCrossCheckByQuestionId,
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

  if (critMode === 'full') {
    appendProgressiveCertaintyHypothesisTrace({
      responses,
      confidenceByKey: critical.confidenceByKey ?? {},
      trace,
      hypothesisCrossCheckByQuestionId,
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
