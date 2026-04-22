import {
  currentIntakeVersionTuple,
  evaluateIntakeReadinessEnvelope,
  isSupportedIntakeArtifactTuple,
  normalizeIntakeVersionTupleFromStorage,
} from '@glc/intake-core';
import type { DomainKey, IntakeVersionTuple } from '../../../types/audit.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';

type EnforcementPoint = 'pipeline_start' | 'pipeline_next';

export function runIntakeReadinessPreflight(args: {
  responses: Record<string, unknown>;
  slaProductMode: 'full' | 'express';
  collectionMode: string | null | undefined;
  surface: string;
  intakeVersionsRaw: IntakeVersionTuple | Record<string, unknown> | null | undefined;
  enforcementPoint: EnforcementPoint;
  executionCoveragePackage: 'starter' | 'pro' | 'complete';
  /** Post-KPI train 1: forwarded only when pilot + `FEATURE_EXECUTION_PLAN_COVERAGE_SCOPE` are enabled. */
  applyExecutionPlanCoverageScope?: boolean;
  executionSelectedDomains?: DomainKey[];
  executionIncludeStrategy?: boolean;
}) {
  const normalizedIv = normalizeIntakeVersionTupleFromStorage(args.intakeVersionsRaw ?? null);
  const intakeTuple =
    normalizedIv && isSupportedIntakeArtifactTuple(normalizedIv) ? normalizedIv : currentIntakeVersionTuple();
  // Phase-1 contract: baseline readiness enforcement is evaluated at pipeline_start semantics
  // for both /pipeline/start and /pipeline/next boundaries.
  const baselineEnforcementPoint: 'pipeline_start' = 'pipeline_start';
  const readiness = evaluateIntakeReadinessEnvelope({
    responses: args.responses,
    slaProductMode: args.slaProductMode,
    collectionMode: args.collectionMode ?? null,
    surface: args.surface,
    intakeVersionTuple: intakeTuple,
    enforcementPoint: baselineEnforcementPoint,
    executionCoveragePackage: args.executionCoveragePackage,
    criticalSignalsMode: 'full',
    applyExecutionPlanCoverageScope: args.applyExecutionPlanCoverageScope,
    executionSelectedDomains: args.executionSelectedDomains,
    executionIncludeStrategy: args.executionIncludeStrategy,
  });
  if (readiness.auditReadinessStatus === 'blocked') {
    return {
      blocked: true as const,
      intakeTuple,
      readiness,
      error: pipelineRouteErr.intakeReadinessBlocked({
        flowReadinessStatus: readiness.flowReadinessStatus,
        auditReadinessStatus: readiness.auditReadinessStatus,
        trace: readiness.trace,
      }),
    };
  }
  return { blocked: false as const, intakeTuple, readiness };
}

