/**
 * Shared orchestration pack path: build (optional) → plan governance → persist.
 * Keeps HTTP controllers and pipeline hooks DRY; business toggles via feature-flags facade only.
 */

import {
  getOrchestrationPlanGovernanceRolloutMode,
  isOrchestrationPackApiEnabled,
  isOrchestrationPackAutoAfterStrategyEnabled,
} from '../../config/feature-flags.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../config/orchestration-telemetry-policy.js';
import { ORCHESTRATION_PLAN_GOVERNANCE_POLICY } from '../../config/orchestration-plan-governance-policy.js';
import {
  isTightenedQualityRolloutReady,
  resolveOrchestrationPlanGovernanceRolloutTransition,
} from '../../config/orchestration-plan-governance-rollout-policy.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { GlcOrchestrationPackRevisionDiff } from '../../schemas/orchestration-pack-revision-diff.js';
import type { OrchestrationPlanGovernance } from '../../schemas/orchestration-plan-governance.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';
import { evaluateOrchestrationPlanGovernance } from './orchestration-plan-governance.service.js';
import {
  buildOrchestrationPackForAuditWithStatus,
  persistGlcOrchestrationPack,
  type OrchestrationPackBuildNotReadyReasonCode,
} from './orchestration-read.service.js';
import {
  RoadmapManifestMismatchError,
  fetchLatestRoadmapManifestSnapshotIdForAudit,
  fetchRoadmapManifestSnapshotForAudit,
} from './roadmap-manifest.service.js';
import { summarizeOrchestrationPackRevisionDiff } from './orchestration-pack-diff.js';
import { applySelectedActionHint } from './apply-selected-action-hint.js';

export type OrchestrationPackPersistLogComponent =
  | 'route.orchestration_pack'
  | 'route.orchestration_commercial_offer'
  | 'pipeline.auto_pack_after_strategy'
  | 'director.deep_dive';

export type TryPersistOrchestrationPackWithGovernanceOk = {
  ok: true;
  pack: GlcOrchestrationPack;
  orchestration_pack_version: number;
  last_revision_diff: GlcOrchestrationPackRevisionDiff | null;
  last_revision_diff_summary: ReturnType<typeof summarizeOrchestrationPackRevisionDiff>;
  plan_governance: OrchestrationPlanGovernance;
  rollout_transition: ReturnType<typeof resolveOrchestrationPlanGovernanceRolloutTransition>;
};

export type TryPersistOrchestrationPackWithGovernanceErr =
  | { ok: false; kind: 'governance_reject'; plan_governance: OrchestrationPlanGovernance; pack: GlcOrchestrationPack }
  | {
      ok: false;
      kind: 'persist_failed';
      plan_governance: OrchestrationPlanGovernance;
      pack: GlcOrchestrationPack;
      error: Error;
    };

export type TryPersistOrchestrationPackWithGovernanceResult =
  | TryPersistOrchestrationPackWithGovernanceOk
  | TryPersistOrchestrationPackWithGovernanceErr;

function computeLaneImbalance(pack: { lanes?: Record<string, string[]> }): number {
  if (!pack?.lanes) return 0;
  const counts = Object.values(pack.lanes).map(v => (Array.isArray(v) ? v.length : 0));
  if (counts.length === 0) return 0;
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max - min;
}

/**
 * Evaluates plan governance, optionally blocks persist, then persists the pack.
 * Emits the same structured logs as the orchestration pack HTTP route for observability parity.
 */
export async function tryPersistOrchestrationPackWithGovernance(args: {
  auditId: string;
  userId: string;
  pack: GlcOrchestrationPack;
  logComponent: OrchestrationPackPersistLogComponent;
}): Promise<TryPersistOrchestrationPackWithGovernanceResult> {
  const governanceRolloutMode = getOrchestrationPlanGovernanceRolloutMode();
  const plan_governance = evaluateOrchestrationPlanGovernance(args.pack, {
    rolloutMode: governanceRolloutMode,
  });
  const tightenedQualityRolloutReady = isTightenedQualityRolloutReady({
    dependencyIntegrityScore: plan_governance.dependency_integrity_score,
    confidenceCoverageScore: plan_governance.confidence_coverage_score,
    riskCoverageScore: plan_governance.risk_coverage_score,
  });
  const rollout_transition = resolveOrchestrationPlanGovernanceRolloutTransition({
    currentMode: governanceRolloutMode,
    readiness: {
      dependencyIntegrityScore: plan_governance.dependency_integrity_score,
      confidenceCoverageScore: plan_governance.confidence_coverage_score,
      riskCoverageScore: plan_governance.risk_coverage_score,
    },
  });

  if (
    governanceRolloutMode === 'shadow' &&
    plan_governance.decision_hint === 'refine_plan'
  ) {
    logger.warn('orchestration_pack_governance_shadow_would_fail', {
      component: args.logComponent,
      auditId: args.auditId,
      metric: 'orchestration_pack_run.shadow_would_fail',
      governance_reason_codes: plan_governance.reason_codes,
    });
  }

  if (
    ORCHESTRATION_PLAN_GOVERNANCE_POLICY.blockPersistOnRefinePlan &&
    plan_governance.decision === 'reject'
  ) {
    logger.warn('orchestration_pack_rejected', {
      component: args.logComponent,
      auditId: args.auditId,
      reason: 'plan_requires_refinement',
      metric: ORCHESTRATION_TELEMETRY_METRICS.planGateReject,
      metric_legacy: 'orchestration_pack_run.refine_required',
      governance_reason_codes: plan_governance.reason_codes,
      input_quality_gate_status: args.pack.input_quality?.input_gate_status,
      input_quality_mode: args.pack.input_quality?.input_mode,
      director_input_coverage_ratio: args.pack.input_quality?.director_input_coverage_ratio ?? 0,
    });
    return { ok: false, kind: 'governance_reject', plan_governance, pack: args.pack };
  }

  const { orchestration_pack_version, last_revision_diff, error: persistErr } =
    await persistGlcOrchestrationPack({
      auditId: args.auditId,
      userId: args.userId,
      pack: args.pack,
    });

  if (persistErr) {
    logger.error('orchestration_pack_persist_failed', {
      component: args.logComponent,
      auditId: args.auditId,
      metric: ORCHESTRATION_TELEMETRY_METRICS.packRunFailure,
      error: persistErr.message,
    });
    return {
      ok: false,
      kind: 'persist_failed',
      plan_governance,
      pack: args.pack,
      error: persistErr,
    };
  }

  const last_revision_diff_summary = summarizeOrchestrationPackRevisionDiff(last_revision_diff);
  logger.info('orchestration_pack_success', {
    component: args.logComponent,
    auditId: args.auditId,
    metric: 'orchestration_pack_run.success',
    roadmap_version: orchestration_pack_version,
    nodes_count: args.pack.graph.nodes.length,
    edges_count: args.pack.graph.edges.length,
    conflicts_count: args.pack.conflicts_resolved.length,
    governance_decision_hint: plan_governance.decision_hint,
    governance_status: plan_governance.status,
    governance_rollout_mode: plan_governance.rollout_mode,
    governance_next_rollout_mode: rollout_transition.recommendedMode,
    governance_reason_codes: plan_governance.reason_codes,
    input_quality_gate_status: args.pack.input_quality?.input_gate_status,
    input_quality_mode: args.pack.input_quality?.input_mode,
    tightened_quality_rollout_ready: tightenedQualityRolloutReady ? 1 : 0,
    kpi_pack_refine_required: plan_governance.decision_hint === 'refine_plan' ? 1 : 0,
    kpi_pack_input_gate_degraded: args.pack.input_quality?.input_gate_status === 'degraded' ? 1 : 0,
    kpi_pack_director_input_coverage_ratio: args.pack.input_quality?.director_input_coverage_ratio ?? 0,
    kpi_pack_lane_imbalance: computeLaneImbalance(args.pack),
    kpi_unresolved_conflicts_rate:
      args.pack.conflicts_resolved.length === 0
        ? 0
        : Number((plan_governance.unresolved_conflicts / args.pack.conflicts_resolved.length).toFixed(4)),
    kpi_governance_coverage_score: plan_governance.coverage_score,
    kpi_governance_integrity_score: plan_governance.integrity_score,
    [ORCHESTRATION_TELEMETRY_METRICS.refinePlanRate]:
      plan_governance.decision_hint === 'refine_plan' ? 1 : 0,
    [ORCHESTRATION_TELEMETRY_METRICS.degradedInputRate]:
      args.pack.input_quality?.input_gate_status === 'degraded' ? 1 : 0,
    last_revision_diff_summary,
    [ORCHESTRATION_TELEMETRY_METRICS.planGovernanceRolloutObservation]: 1,
  });

  return {
    ok: true,
    pack: args.pack,
    orchestration_pack_version,
    last_revision_diff,
    last_revision_diff_summary,
    plan_governance,
    rollout_transition,
  };
}

export type RunOrchestrationPackPersistFlowFromManifestResult =
  | (TryPersistOrchestrationPackWithGovernanceOk & { build_reason?: undefined })
  | TryPersistOrchestrationPackWithGovernanceErr
  | { ok: false; kind: 'not_ready'; reason_code: OrchestrationPackBuildNotReadyReasonCode }
  | { ok: false; kind: 'manifest_mismatch' }
  | { ok: false; kind: 'invalid_selected_action_ids'; invalid_ids: string[] };

/**
 * Builds pack from manifest snapshot, then governance + persist (same rules as POST /orchestration/pack).
 */
export async function runOrchestrationPackPersistFlowFromManifest(args: {
  auditId: string;
  userId: string;
  manifestSnapshotId: string;
  logComponent: OrchestrationPackPersistLogComponent;
  selectedActionIds?: string[];
}): Promise<RunOrchestrationPackPersistFlowFromManifestResult> {
  const explicitSelectionProvided = args.selectedActionIds !== undefined;
  const manifestRow =
    explicitSelectionProvided
      ? null
      : await fetchRoadmapManifestSnapshotForAudit({
          auditId: args.auditId,
          snapshotId: args.manifestSnapshotId,
        });
  const effectiveSelectedActionIds = explicitSelectionProvided
    ? args.selectedActionIds ?? []
    : (manifestRow?.payload.selected_action_ids ?? []);

  let buildResult: Awaited<ReturnType<typeof buildOrchestrationPackForAuditWithStatus>>;
  try {
    buildResult = await buildOrchestrationPackForAuditWithStatus({
      auditId: args.auditId,
      userId: args.userId,
      manifestSnapshotId: args.manifestSnapshotId,
    });
  } catch (err) {
    if (err instanceof RoadmapManifestMismatchError) {
      return { ok: false, kind: 'manifest_mismatch' };
    }
    throw err;
  }

  if (buildResult.status === 'not_ready') {
    return { ok: false, kind: 'not_ready', reason_code: buildResult.reason_code };
  }

  let pack = buildResult.pack;
  if (effectiveSelectedActionIds.length > 0) {
    const existing = new Set(pack.graph.nodes.map((node) => node.id));
    const invalid = effectiveSelectedActionIds.filter((id) => !existing.has(id));
    if (invalid.length > 0) {
      return { ok: false, kind: 'invalid_selected_action_ids', invalid_ids: invalid };
    }
    pack = applySelectedActionHint(pack, effectiveSelectedActionIds);
  }

  return tryPersistOrchestrationPackWithGovernance({
    auditId: args.auditId,
    userId: args.userId,
    pack,
    logComponent: args.logComponent,
  });
}

/**
 * After strategy phase completes: if flags allow, persist pack from latest manifest snapshot.
 * Never throws — failures are logged; pipeline completion is not blocked.
 */
export async function maybeAutoPersistOrchestrationPackAfterStrategy(args: { auditId: string }): Promise<void> {
  if (!isOrchestrationPackApiEnabled() || !isOrchestrationPackAutoAfterStrategyEnabled()) {
    return;
  }

  const latest = await fetchLatestRoadmapManifestSnapshotIdForAudit({ auditId: args.auditId });
  if (!latest) {
    logger.info('orchestration.auto_pack_after_strategy_skipped', {
      auditId: args.auditId,
      reason: 'no_manifest_snapshot',
    });
    return;
  }

  const { data: audit, error: auditErr } = await supabase
    .from('audits')
    .select('user_id')
    .eq('id', args.auditId)
    .maybeSingle();

  if (auditErr || !audit?.user_id) {
    logger.warn('orchestration.auto_pack_after_strategy_skipped', {
      auditId: args.auditId,
      reason: 'audit_user_missing',
      message: auditErr?.message,
    });
    return;
  }

  const flow = await runOrchestrationPackPersistFlowFromManifest({
    auditId: args.auditId,
    userId: audit.user_id,
    manifestSnapshotId: latest.id,
    logComponent: 'pipeline.auto_pack_after_strategy',
  });

  if (!flow.ok) {
    if (flow.kind === 'not_ready') {
      logger.warn('orchestration.auto_pack_after_strategy_not_ready', {
        auditId: args.auditId,
        not_ready_reason_code: flow.reason_code,
      });
    } else if (flow.kind === 'manifest_mismatch') {
      logger.warn('orchestration.auto_pack_after_strategy_manifest_mismatch', {
        auditId: args.auditId,
      });
    } else if (flow.kind === 'governance_reject') {
      logger.warn('orchestration.auto_pack_after_strategy_governance_reject', {
        auditId: args.auditId,
        governance_reason_codes: flow.plan_governance.reason_codes,
      });
    } else if (flow.kind === 'persist_failed') {
      logger.error('orchestration.auto_pack_after_strategy_persist_failed', {
        auditId: args.auditId,
        error: flow.error.message,
      });
    } else {
      logger.error('orchestration.auto_pack_after_strategy_persist_failed', {
        auditId: args.auditId,
        kind: flow.kind,
      });
    }
    return;
  }

  logger.info('orchestration.auto_pack_after_strategy_ok', {
    auditId: args.auditId,
    orchestration_pack_version: flow.orchestration_pack_version,
    manifest_snapshot_id: latest.id,
  });
}
