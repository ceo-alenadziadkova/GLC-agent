import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { idempotencyPostAuditsOrchestrationPackKey } from '../../../config/api-http-paths.js';
import { isConsultantGovernanceCtasEnabled, isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../../config/orchestration-telemetry-policy.js';
import { ORCHESTRATION_PLAN_GOVERNANCE_POLICY, ORCHESTRATION_PLAN_GOVERNANCE_REMEDIATIONS } from '../../../config/orchestration-plan-governance-policy.js';
import {
  AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
  ORCHESTRATION_GOVERNANCE_CTAS_DISABLED_MESSAGE,
} from '../../../config/api-user-messages.en.js';
import {
  getStoredIdempotentResponse,
  isIdempotencyPayloadConflictError,
  storeIdempotentResponse,
} from '../../../lib/idempotency.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { runOrchestrationPackPersistFlowFromManifest } from '../../../services/orchestration/orchestration-pack-persist-run.service.js';
import { runGovernancePackAction } from '../../../services/orchestration/orchestration-governance-ack.service.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { RoadmapManifestMismatchError } from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

const BodySchema = z
  .object({
    manifest_snapshot_id: z.string().uuid().optional(),
    selected_action_ids: z.array(z.string().min(1)).max(50).optional(),
    govern_action: z.enum(['accept_plan', 'accept_with_warnings', 'refine_plan']).optional(),
    expected_orchestration_pack_version: z.number().int().positive().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.govern_action) {
      if (val.expected_orchestration_pack_version == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expected_orchestration_pack_version'],
          message: 'Required when govern_action is set',
        });
      }
    } else if (!val.manifest_snapshot_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['manifest_snapshot_id'],
        message: 'Required when govern_action is not set',
      });
    }
  });

export async function postOrchestrationPackController(req: AuthRequest, res: Response) {
  await executePostOrchestrationPack(req, res, idempotencyPostAuditsOrchestrationPackKey(req.params.id as string));
}

export async function executePostOrchestrationPack(req: AuthRequest, res: Response, idempotencyRoute: string) {
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

    const idempotent = await getStoredIdempotentResponse(req, idempotencyRoute, req.body);
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    if (parsedBody.data.govern_action) {
      if (!isConsultantGovernanceCtasEnabled()) {
        sendApiError(
          res,
          403,
          API_ERROR_CODES.ORCHESTRATION_GOVERNANCE_CTAS_DISABLED,
          ORCHESTRATION_GOVERNANCE_CTAS_DISABLED_MESSAGE,
        );
        return;
      }
      const gov = await runGovernancePackAction({
        auditId,
        userId: req.userId!,
        action: parsedBody.data.govern_action,
        expectedOrchestrationPackVersion: parsedBody.data.expected_orchestration_pack_version!,
      });
      if (!gov.ok) {
        if (gov.kind === 'stale') {
          sendApiError(
            res,
            409,
            API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION,
            AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
            { current_orchestration_pack_version: parsedBody.data.expected_orchestration_pack_version },
          );
          return;
        }
        if (gov.kind === 'no_pack') {
          sendApiError(
            res,
            409,
            API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY,
            AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
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
      const refreshed = await fetchPersistedGlcOrchestrationPackForUser({
        auditId,
        userId: req.userId!,
      });
      const payload = {
        pack: refreshed.status === 'ok' ? refreshed.pack : null,
        orchestration_pack_version: gov.orchestration_pack_version,
        refine_hint: gov.refine_hint,
        govern_action: parsedBody.data.govern_action,
      };
      await storeIdempotentResponse(
        req,
        idempotencyRoute,
        idempotent.key,
        idempotent.hash,
        { statusCode: 200, payload },
        auditId,
      );
      res.json(payload);
      return;
    }

    const flow = await runOrchestrationPackPersistFlowFromManifest({
      auditId,
      userId: req.userId!,
      manifestSnapshotId: parsedBody.data.manifest_snapshot_id!,
      logComponent: 'route.orchestration_pack',
      selectedActionIds: parsedBody.data.selected_action_ids,
    });

    if (!flow.ok) {
      if (flow.kind === 'not_ready') {
        logger.warn('route.orchestration_pack_rejected', {
          component: 'audits',
          reason: 'pack_not_ready',
          not_ready_reason_code: flow.reason_code,
          metric: 'orchestration_pack_run.not_ready',
        });
        sendApiError(
          res,
          409,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY,
          AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
          { not_ready_reason_code: flow.reason_code },
        );
        return;
      }
      if (flow.kind === 'manifest_mismatch') {
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
      if (flow.kind === 'governance_reject') {
        sendApiError(
          res,
          409,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT,
          AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
          {
            plan_governance: flow.plan_governance,
            remediation: flow.plan_governance.reason_codes.map(code => ({
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
      if (flow.kind === 'invalid_selected_action_ids') {
        sendApiError(
          res,
          400,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID,
          AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
          { invalid_selected_action_ids: flow.invalid_ids },
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

    const payload = {
      pack: flow.pack,
      orchestration_pack_version: flow.orchestration_pack_version,
      roadmap_version: flow.orchestration_pack_version,
      last_revision_diff: flow.last_revision_diff,
      last_revision_diff_summary: flow.last_revision_diff_summary,
      plan_governance: flow.plan_governance,
      rollout_transition: flow.rollout_transition,
    };
    await storeIdempotentResponse(
      req,
      idempotencyRoute,
      idempotent.key,
      idempotent.hash,
      { statusCode: 200, payload },
      auditId,
    );
    res.json(payload);
  } catch (err) {
    if (isIdempotencyPayloadConflictError(err)) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
        IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
      );
      return;
    }
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
      metric: ORCHESTRATION_TELEMETRY_METRICS.packRunFailure,
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
  }
}
