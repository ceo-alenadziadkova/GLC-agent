import type { Response } from 'express';
import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
  AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { ORCHESTRATION_PLAN_GOVERNANCE_POLICY } from '../../../config/orchestration-plan-governance-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { OrchestrationCommercialOfferRequestSchema } from '../../../schemas/orchestration-commercial-offer.js';
import {
  buildOrchestrationPackForAudit,
  loadAuditExecutionPlanRow,
  persistGlcOrchestrationPack,
  updateAuditExecutionPlanSelectedDomainsForUser,
} from '../../../services/orchestration/orchestration-read.service.js';
import { buildOrchestrationCommercialOffer } from '../../../services/orchestration/orchestration-commercial-offer.service.js';
import { evaluateOrchestrationPlanGovernance } from '../../../services/orchestration/orchestration-plan-governance.service.js';
import { insertRoadmapManifestSnapshot } from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postOrchestrationCommercialOfferController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }
    const parsedBody = OrchestrationCommercialOfferRequestSchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID,
        AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
        { detail: parsedBody.error.flatten() },
      );
      return;
    }

    const auditId = req.params.id as string;
    const auditCtx = await loadAuditExecutionPlanRow(auditId, req.userId!);
    if (!auditCtx) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const result = buildOrchestrationCommercialOffer({
      executionPlan: auditCtx.plan,
      request: parsedBody.data,
    });
    let accepted_pack_result: {
      manifest_snapshot_id: string;
      orchestration_pack_version: number;
      roadmap_version: number;
      last_revision_diff: unknown;
      plan_governance: ReturnType<typeof evaluateOrchestrationPlanGovernance>;
    } | null = null;

    const acceptedDomain = result.accepted_domain;
    if (acceptedDomain && result.recalculated_preview) {
      const nextSelectedDomains = Array.from(new Set([...parsedBody.data.selected_domains, acceptedDomain]));
      const updatedPlan = await updateAuditExecutionPlanSelectedDomainsForUser({
        auditId,
        userId: req.userId!,
        selectedDomains: nextSelectedDomains,
      });
      if (updatedPlan.error) {
        sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
        return;
      }

      const manifestInsert = await insertRoadmapManifestSnapshot({
        auditId,
        userId: req.userId!,
        payload: {
          selected_domains: nextSelectedDomains,
          change_scenario: parsedBody.data.change_scenario,
          season_preset: parsedBody.data.season_preset,
        },
      });

      const pack = await buildOrchestrationPackForAudit({
        auditId,
        userId: req.userId!,
        manifestSnapshotId: manifestInsert.id,
      });
      if (!pack) {
        sendApiError(
          res,
          500,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED,
          AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
        );
        return;
      }

      const plan_governance = evaluateOrchestrationPlanGovernance(pack);
      if (
        ORCHESTRATION_PLAN_GOVERNANCE_POLICY.blockPersistOnRefinePlan &&
        plan_governance.decision_hint === 'refine_plan'
      ) {
        sendApiError(
          res,
          409,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT,
          AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
          { plan_governance },
        );
        return;
      }

      const persisted = await persistGlcOrchestrationPack({
        auditId,
        userId: req.userId!,
        pack,
      });
      if (persisted.error) {
        sendApiError(
          res,
          500,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED,
          AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
        );
        return;
      }
      accepted_pack_result = {
        manifest_snapshot_id: manifestInsert.id,
        orchestration_pack_version: persisted.orchestration_pack_version,
        roadmap_version: persisted.orchestration_pack_version,
        last_revision_diff: persisted.last_revision_diff,
        plan_governance,
      };
      logger.info('route.orchestration_commercial_offer_pack_regenerated', {
        component: 'audits',
        metric: 'orchestration_commercial_offer.rebuild_success',
        accepted_domain: acceptedDomain,
        roadmap_version: persisted.orchestration_pack_version,
      });
    }

    logger.info('route.orchestration_commercial_offer_success', {
      component: 'audits',
      metric: 'orchestration_commercial_offer.success',
      offers: result.offers.length,
      accepted_domain: result.accepted_domain,
    });
    res.json({
      ...result,
      accepted_pack_result,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.orchestration_commercial_offer_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED,
      AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED_MESSAGE,
    );
  }
}
