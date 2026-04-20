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
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../../config/orchestration-telemetry-policy.js';
import { ROADMAP_MANIFEST_SCHEMA_VERSION } from '../../../config/orchestration-roadmap-presets.js';
import {
  ORCHESTRATION_PLAN_GOVERNANCE_POLICY,
  ORCHESTRATION_PLAN_GOVERNANCE_REMEDIATIONS,
} from '../../../config/orchestration-plan-governance-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { OrchestrationCommercialOfferRequestSchema } from '../../../schemas/orchestration-commercial-offer.js';
import type { OrchestrationPlanGovernance } from '../../../schemas/orchestration-plan-governance.js';
import {
  buildOrchestrationPackForAudit,
  loadAuditExecutionPlanRow,
  updateAuditExecutionPlanSelectedDomainsForUser,
} from '../../../services/orchestration/orchestration-read.service.js';
import { tryPersistOrchestrationPackWithGovernance } from '../../../services/orchestration/orchestration-pack-persist-run.service.js';
import { buildOrchestrationCommercialOffer } from '../../../services/orchestration/orchestration-commercial-offer.service.js';
import {
  assertManifestMatchesExecutionPlan,
  insertRoadmapManifestSnapshot,
  RoadmapManifestMismatchError,
} from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE } from '../../../config/api-user-messages.en.js';

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
    const manifestPayload = {
      schema_version: parsedBody.data.schema_version ?? ROADMAP_MANIFEST_SCHEMA_VERSION,
      selected_domains: parsedBody.data.selected_domains,
      change_scenario: parsedBody.data.change_scenario,
      season_preset: parsedBody.data.season_preset,
      ...(parsedBody.data.plan_horizon ? { plan_horizon: parsedBody.data.plan_horizon } : {}),
    };
    try {
      assertManifestMatchesExecutionPlan(manifestPayload, auditCtx.plan);
    } catch (e) {
      if (e instanceof RoadmapManifestMismatchError) {
        sendApiError(
          res,
          400,
          API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH,
          AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
        );
        return;
      }
      throw e;
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
      last_revision_diff_summary: unknown;
      plan_governance: OrchestrationPlanGovernance;
    } | null = null;

    const acceptedDomain = result.accepted_domain;
    if (acceptedDomain && result.recalculated_preview) {
      const nextSelectedDomains = Array.from(new Set([...parsedBody.data.selected_domains, acceptedDomain]));
      const rollbackExecutionPlan = async (): Promise<void> => {
        const rollback = await updateAuditExecutionPlanSelectedDomainsForUser({
          auditId,
          userId: req.userId!,
          selectedDomains: auditCtx.plan.selected_domains,
        });
        if (rollback.error) {
          logger.error('route.orchestration_commercial_offer_rollback_failed', {
            component: 'audits',
            metric: 'orchestration_commercial_offer.rollback_fail',
            accepted_domain: acceptedDomain,
            error: rollback.error.message,
          });
        }
      };
      const updatedPlan = await updateAuditExecutionPlanSelectedDomainsForUser({
        auditId,
        userId: req.userId!,
        selectedDomains: nextSelectedDomains,
      });
      if (updatedPlan.error) {
        sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
        return;
      }

      try {
        const manifestInsert = await insertRoadmapManifestSnapshot({
          auditId,
          userId: req.userId!,
          payload: {
            schema_version: ROADMAP_MANIFEST_SCHEMA_VERSION,
            selected_domains: nextSelectedDomains,
            change_scenario: parsedBody.data.change_scenario,
            season_preset: parsedBody.data.season_preset,
            ...(parsedBody.data.plan_horizon ? { plan_horizon: parsedBody.data.plan_horizon } : {}),
          },
        });

        const pack = await buildOrchestrationPackForAudit({
          auditId,
          userId: req.userId!,
          manifestSnapshotId: manifestInsert.id,
        });
        if (!pack) {
          await rollbackExecutionPlan();
          sendApiError(
            res,
            500,
            API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED,
            AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
          );
          return;
        }

        const persistFlow = await tryPersistOrchestrationPackWithGovernance({
          auditId,
          userId: req.userId!,
          pack,
          logComponent: 'route.orchestration_commercial_offer',
        });
        if (!persistFlow.ok) {
          await rollbackExecutionPlan();
          if (persistFlow.kind === 'governance_reject') {
            sendApiError(
              res,
              409,
              API_ERROR_CODES.AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT,
              AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
              {
                plan_governance: persistFlow.plan_governance,
                remediation: persistFlow.plan_governance.reason_codes.map(code => ({
                  code,
                  action: ORCHESTRATION_PLAN_GOVERNANCE_REMEDIATIONS[code],
                })),
                auto_refine: {
                  enabled: ORCHESTRATION_PLAN_GOVERNANCE_POLICY.autoRefine.enabled,
                  max_attempts: ORCHESTRATION_PLAN_GOVERNANCE_POLICY.autoRefine.maxAttempts,
                  idempotency_window_seconds:
                    ORCHESTRATION_PLAN_GOVERNANCE_POLICY.autoRefine.idempotencyWindowSeconds,
                },
              },
            );
            return;
          }
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
          orchestration_pack_version: persistFlow.orchestration_pack_version,
          roadmap_version: persistFlow.orchestration_pack_version,
          last_revision_diff: persistFlow.last_revision_diff,
          last_revision_diff_summary: persistFlow.last_revision_diff_summary,
          plan_governance: persistFlow.plan_governance,
        };
        logger.info('route.orchestration_commercial_offer_pack_regenerated', {
          component: 'audits',
          metric: 'orchestration_commercial_offer.rebuild_success',
          accepted_domain: acceptedDomain,
          roadmap_version: persistFlow.orchestration_pack_version,
          governance_rollout_mode: persistFlow.plan_governance.rollout_mode,
          last_revision_diff_summary: persistFlow.last_revision_diff_summary,
        });
      } catch (rebuildErr) {
        await rollbackExecutionPlan();
        throw rebuildErr;
      }
    }

    logger.info('route.orchestration_commercial_offer_success', {
      component: 'audits',
      metric: 'orchestration_commercial_offer.success',
      offers: result.offers.length,
      accepted_domain: result.accepted_domain,
      kpi_coverage_expansion_offer_shown: result.offers.length > 0 ? 1 : 0,
      kpi_coverage_expansion_conversion: result.accepted_domain ? 1 : 0,
      [ORCHESTRATION_TELEMETRY_METRICS.versionAdoptionRate]: result.accepted_domain ? 1 : 0,
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
