import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  getOrchestrationPlanGovernanceRolloutMode,
  isOrchestrationPackApiEnabled,
} from '../../../config/feature-flags.js';
import { ORCHESTRATION_PLAN_GOVERNANCE_POLICY } from '../../../config/orchestration-plan-governance-policy.js';
import { AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE } from '../../../config/api-user-messages.en.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  buildOrchestrationPackForAudit,
  persistGlcOrchestrationPack,
} from '../../../services/orchestration/orchestration-read.service.js';
import { RoadmapManifestMismatchError } from '../../../services/orchestration/roadmap-manifest.service.js';
import { evaluateOrchestrationPlanGovernance } from '../../../services/orchestration/orchestration-plan-governance.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

const BodySchema = z.object({
  manifest_snapshot_id: z.string().uuid(),
});

export async function postOrchestrationPackController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const parsedBody = BodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      logger.warn('route.orchestration_pack_rejected', {
        component: 'audits',
        reason: 'payload_invalid',
        metric: 'orchestration_pack_run.validation_fail',
      });
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID,
        AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
        { detail: parsedBody.error.flatten() },
      );
      return;
    }

    const pack = await buildOrchestrationPackForAudit({
      auditId,
      userId: req.userId!,
      manifestSnapshotId: parsedBody.data.manifest_snapshot_id,
    });

    if (!pack) {
      logger.warn('route.orchestration_pack_rejected', {
        component: 'audits',
        reason: 'pack_not_ready',
        metric: 'orchestration_pack_run.not_ready',
      });
      sendApiError(
        res,
        409,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY,
        AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
      );
      return;
    }

    const governanceRolloutMode = getOrchestrationPlanGovernanceRolloutMode();
    const plan_governance = evaluateOrchestrationPlanGovernance(pack, {
      rolloutMode: governanceRolloutMode,
    });
    if (
      governanceRolloutMode === 'shadow' &&
      plan_governance.decision_hint === 'refine_plan'
    ) {
      logger.warn('route.orchestration_pack_governance_shadow_would_fail', {
        component: 'audits',
        metric: 'orchestration_pack_run.shadow_would_fail',
        governance_reason_codes: plan_governance.reason_codes,
      });
    }
    if (
      ORCHESTRATION_PLAN_GOVERNANCE_POLICY.blockPersistOnRefinePlan &&
      plan_governance.decision === 'reject'
    ) {
      logger.warn('route.orchestration_pack_rejected', {
        component: 'audits',
        reason: 'plan_requires_refinement',
        metric: 'orchestration_pack_run.refine_required',
        governance_reason_codes: plan_governance.reason_codes,
      });
      sendApiError(
        res,
        409,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT,
        AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
        { plan_governance },
      );
      return;
    }

    const { orchestration_pack_version, last_revision_diff, error: persistErr } = await persistGlcOrchestrationPack({
      auditId,
      userId: req.userId!,
      pack,
    });
    if (persistErr) {
      logger.error('route.orchestration_pack_persist_failed', {
        component: 'audits',
        metric: 'orchestration_pack_run.persist_fail',
        error: persistErr.message,
      });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
      return;
    }

    logger.info('route.orchestration_pack_success', {
      component: 'audits',
      metric: 'orchestration_pack_run.success',
      roadmap_version: orchestration_pack_version,
      nodes_count: pack.graph.nodes.length,
      edges_count: pack.graph.edges.length,
      conflicts_count: pack.conflicts_resolved.length,
      governance_decision_hint: plan_governance.decision_hint,
      governance_status: plan_governance.status,
      governance_rollout_mode: plan_governance.rollout_mode,
      governance_reason_codes: plan_governance.reason_codes,
      kpi_pack_refine_required: plan_governance.decision_hint === 'refine_plan' ? 1 : 0,
      kpi_pack_lane_imbalance: computeLaneImbalance(pack),
    });
    res.json({
      pack,
      orchestration_pack_version,
      roadmap_version: orchestration_pack_version,
      last_revision_diff,
      plan_governance,
    });
  } catch (err) {
    if (err instanceof RoadmapManifestMismatchError) {
      logger.warn('route.orchestration_pack_rejected', {
        component: 'audits',
        reason: 'manifest_execution_plan_mismatch',
        metric: 'orchestration_pack_run.mismatch',
      });
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH,
        AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
      );
      return;
    }
    const error = err as Error;
    logger.error('route.orchestration_pack_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
  }
}

function computeLaneImbalance(pack: { lanes?: Record<string, string[]> }): number {
  if (!pack?.lanes) return 0;
  const counts = Object.values(pack.lanes).map(v => (Array.isArray(v) ? v.length : 0));
  if (counts.length === 0) return 0;
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max - min;
}
