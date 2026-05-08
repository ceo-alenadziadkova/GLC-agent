import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ORCHESTRATION_PLAN_REQUIRES_REFINEMENT_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { idempotencyPostAuditsOrchestrationCompileKey } from '../../../config/api-http-paths.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../../config/orchestration-telemetry-policy.js';
import { ORCHESTRATION_PLAN_GOVERNANCE_POLICY, ORCHESTRATION_PLAN_GOVERNANCE_REMEDIATIONS } from '../../../config/orchestration-plan-governance-policy.js';
import {
  getStoredIdempotentResponse,
  isIdempotencyPayloadConflictError,
  storeIdempotentResponse,
} from '../../../lib/idempotency.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  formatOrchestrationCompileSnapshotRollbackDeleteFailedMessageEn,
  operationsAlertTitlesEn,
} from '../../../config/operations-alerts-copy.en.js';
import { logger } from '../../../services/logger.js';
import { emitStructuredNotification } from '../../../services/notifications.js';
import { RoadmapManifestPayloadSchema } from '../../../schemas/roadmap-manifest.js';
import {
  clearManifestDraftRevisionsForAudit,
  listManifestDraftRevisionsForAudit,
  mergeQueuedDraftRevisionsIntoManifestPayload,
} from '../../../services/orchestration/manifest-draft-revision.service.js';
import {
  assertManifestMatchesExecutionPlan,
  deleteRoadmapManifestSnapshotById,
  insertRoadmapManifestSnapshot,
  RoadmapManifestMismatchError,
} from '../../../services/orchestration/roadmap-manifest.service.js';
import {
  fetchPersistedGlcOrchestrationPackForUser,
  loadAuditExecutionPlanRow,
} from '../../../services/orchestration/orchestration-read.service.js';
import { runOrchestrationPackPersistFlowFromManifest } from '../../../services/orchestration/orchestration-pack-persist-run.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

/** Optional orchestrator selection; parsed separately because `RoadmapManifestPayloadSchema` uses refinements (no `.extend`). */
const CompileSelectedActionIdsSchema = z.object({
  selected_action_ids: z.array(z.string().min(1)).max(50).optional(),
});

/**
 * `POST /api/audits/:id/orchestration/compile`
 *
 * Persists a roadmap manifest snapshot (including draft merge semantics) then runs the orchestration
 * pack persist flow. If pack build/persist fails after the snapshot insert, the snapshot row is removed
 * so the audit does not retain a dangling compile attempt.
 */
export async function postOrchestrationCompileController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const parsedManifest = RoadmapManifestPayloadSchema.safeParse(req.body);
    const parsedSelectedIds = CompileSelectedActionIdsSchema.safeParse(req.body);
    if (!parsedManifest.success || !parsedSelectedIds.success) {
      logger.warn('route.orchestration_compile_rejected', {
        component: 'audits',
        reason: 'payload_invalid',
        metric: 'orchestration_compile.validation_fail',
      });
      const detail = !parsedManifest.success
        ? parsedManifest.error.flatten()
        : // Manifest parsed: combined `||` gate means selected_action_ids parse failed here.
          parsedSelectedIds.error!.flatten();
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID,
        AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
        { detail },
      );
      return;
    }

    const idempotent = await getStoredIdempotentResponse(
      req,
      idempotencyPostAuditsOrchestrationCompileKey(auditId),
      req.body,
    );
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    const auditCtx = await loadAuditExecutionPlanRow(auditId, req.userId!);
    if (!auditCtx) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const manifestPayload = parsedManifest.data;
    const selectedActionIds = parsedSelectedIds.data.selected_action_ids;

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

    let payloadToPersist = manifestPayload;
    const { rows: queuedDraftRows, error: queuedDraftErr } = await listManifestDraftRevisionsForAudit({ auditId });
    if (queuedDraftErr) {
      sendApiError(
        res,
        500,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED,
        AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED_MESSAGE,
      );
      return;
    }
    if (queuedDraftRows.length > 0) {
      const mergedPayload = mergeQueuedDraftRevisionsIntoManifestPayload({
        base: manifestPayload,
        draftRows: queuedDraftRows,
      });
      const revalidated = RoadmapManifestPayloadSchema.safeParse(mergedPayload);
      if (!revalidated.success) {
        sendApiError(
          res,
          400,
          API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID,
          AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
          { detail: revalidated.error.flatten() },
        );
        return;
      }
      try {
        assertManifestMatchesExecutionPlan(revalidated.data, auditCtx.plan);
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
      payloadToPersist = revalidated.data;
    }

    const { id: manifestSnapshotId } = await insertRoadmapManifestSnapshot({
      auditId,
      userId: req.userId!,
      payload: payloadToPersist,
    });

    if (queuedDraftRows.length > 0) {
      const { error: clearErr } = await clearManifestDraftRevisionsForAudit(auditId);
      if (clearErr) {
        logger.warn('route.orchestration_compile_draft_revision_clear_failed', {
          auditId,
          snapshot_id: manifestSnapshotId,
          error: clearErr.message,
        });
      }
    }

    const flow = await runOrchestrationPackPersistFlowFromManifest({
      auditId,
      userId: req.userId!,
      manifestSnapshotId,
      logComponent: 'route.orchestration_pack',
      selectedActionIds,
    });

    if (!flow.ok) {
      const { error: delErr } = await deleteRoadmapManifestSnapshotById({ auditId, snapshotId: manifestSnapshotId });
      if (delErr) {
        logger.error('route.orchestration_compile_snapshot_rollback_failed', {
          auditId,
          snapshot_id: manifestSnapshotId,
          error: delErr.message,
          metric: 'orchestration_compile.snapshot_rollback_delete_failed',
        });
        await emitStructuredNotification({
          category: 'system',
          event: 'orchestration_compile_snapshot_rollback_delete_failed',
          priority: 'critical',
          audience: 'consultants',
          title: operationsAlertTitlesEn.orchestrationCompileSnapshotRollbackDeleteFailed,
          message: formatOrchestrationCompileSnapshotRollbackDeleteFailedMessageEn({
            auditId,
            snapshotId: manifestSnapshotId,
            error: delErr.message,
          }),
          auditId,
          payload: { audit_id: auditId, snapshot_id: manifestSnapshotId },
          sendInApp: true,
          sendTelegram: true,
        }).catch((notifyErr) => {
          logger.error('route.orchestration_compile_snapshot_rollback_alert_emit_failed', {
            auditId,
            snapshot_id: manifestSnapshotId,
            error: (notifyErr as Error).message,
          });
        });
      }

      if (flow.kind === 'not_ready') {
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
      if (flow.kind === 'persist_failed') {
        sendApiError(
          res,
          500,
          API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED,
          AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
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
      manifest_snapshot_id: manifestSnapshotId,
      pack: flow.pack,
      orchestration_pack_version: flow.orchestration_pack_version,
      roadmap_version: flow.orchestration_pack_version,
      last_revision_diff: flow.last_revision_diff,
      last_revision_diff_summary: flow.last_revision_diff_summary,
      plan_governance: flow.plan_governance,
      rollout_transition: flow.rollout_transition,
      persisted_pack: refreshed.status === 'ok' ? refreshed.pack : null,
    };

    await storeIdempotentResponse(
      req,
      idempotencyPostAuditsOrchestrationCompileKey(auditId),
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
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH,
        AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
      );
      return;
    }
    const error = err as Error;
    logger.error('route.orchestration_compile_failed', {
      component: 'audits',
      metric: ORCHESTRATION_TELEMETRY_METRICS.packRunFailure,
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
  }
}
