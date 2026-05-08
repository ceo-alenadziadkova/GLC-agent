import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  MANIFEST_DRAFT_REVISION_REJECTED_MESSAGE,
  MANIFEST_DRAFT_REVISIONS_DISABLED_MESSAGE,
  PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE,
} from '../../../config/api-user-messages.en.js';
import { idempotencyPostAuditsRoadmapManifestDraftRevisionsKey } from '../../../config/api-http-paths.js';
import {
  isManifestDraftRevisionsFromBoardEnabled,
  isOrchestrationPackApiEnabled,
} from '../../../config/feature-flags.js';
import {
  isPlanBoardOperationalReadOnlyPack,
} from '../../../config/plan-board-operational-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  getStoredIdempotentResponse,
  isIdempotencyPayloadConflictError,
  storeIdempotentResponse,
} from '../../../lib/idempotency.js';
import { ManifestDraftRevisionPostSchema } from '../../../schemas/manifest-draft-revision-post.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import {
  digestManifestDraftRevisions,
  listManifestDraftRevisionsForAudit,
  upsertManifestDraftRevision,
} from '../../../services/orchestration/manifest-draft-revision.service.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { logger } from '../../../services/logger.js';
import { supabase } from '../../../services/supabase.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postRoadmapManifestDraftRevisionController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;

  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }
    if (!isManifestDraftRevisionsFromBoardEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.MANIFEST_DRAFT_REVISIONS_DISABLED, MANIFEST_DRAFT_REVISIONS_DISABLED_MESSAGE);
      return;
    }

    const parsed = ManifestDraftRevisionPostSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID, AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE, {
        detail: parsed.error.flatten(),
      });
      return;
    }

    const idempotent = await getStoredIdempotentResponse(
      req,
      idempotencyPostAuditsRoadmapManifestDraftRevisionsKey(auditId),
      req.body,
    );
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
      return;
    }

    const access = await resolveAuditPlanBoardAccess({ auditId, userId: req.userId!, userRole: req.userRole });
    if (!access.ok) {
      sendApiError(
        res,
        access.reason === 'denied' ? 403 : 404,
        API_ERROR_CODES.AUDITS_NOT_FOUND,
        AUDITS_NOT_FOUND_MESSAGE,
      );
      return;
    }
    if (access.kind !== 'consultant_owner' && access.kind !== 'platform_admin') {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }

    const persisted = await fetchPersistedGlcOrchestrationPackForUser({
      auditId,
      userId: req.userId!,
    });
    if (persisted.status !== 'ok' || !persisted.pack) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY,
        AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
        { not_ready_reason_code: 'no_pack' },
      );
      return;
    }
    if (isPlanBoardOperationalReadOnlyPack(persisted.pack)) {
      sendApiError(res, 409, API_ERROR_CODES.PLAN_BOARD_GOVERNANCE_BLOCKED, PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE, {
        code: 'governance_blocked',
      });
      return;
    }
    if (persisted.orchestration_pack_version !== parsed.data.expected_pack_version) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION,
        AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
        { pack_version_actual: persisted.orchestration_pack_version },
      );
      return;
    }

    const { data: cardRow, error: cardErr } = await supabase
      .from('plan_task_delivery')
      .select('id')
      .eq('audit_id', auditId)
      .eq('canonical_node_key', parsed.data.canonical_node_key)
      .eq('source', 'pack')
      .maybeSingle();
    if (cardErr || !cardRow) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const up = await upsertManifestDraftRevision({
      auditId,
      userId: req.userId!,
      canonical_node_key: parsed.data.canonical_node_key,
      lane: parsed.data.lane,
      owner_hint: parsed.data.owner_hint,
      expected_pack_version: parsed.data.expected_pack_version,
    });

    if (!up.ok) {
      const msg = up.error.message;
      let code = API_ERROR_CODES.MANIFEST_DRAFT_REVISION_REJECTED;
      if (msg === 'manifest_draft_revision_limit_exceeded') {
        code = API_ERROR_CODES.MANIFEST_DRAFT_REVISION_REJECTED;
      }
      sendApiError(res, 400, code, MANIFEST_DRAFT_REVISION_REJECTED_MESSAGE, {
        detail: msg,
      });
      return;
    }

    const { rows, error: listErr } = await listManifestDraftRevisionsForAudit({ auditId });
    if (listErr) {
      logger.error('route.manifest_draft_revision_list_failed', { auditId, error: listErr.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    const digest = digestManifestDraftRevisions(rows);
    const payload = {
      ok: true as const,
      pending_count: up.pending_count,
      digest,
    };

    await storeIdempotentResponse(
      req,
      idempotencyPostAuditsRoadmapManifestDraftRevisionsKey(auditId),
      idempotent.key,
      idempotent.hash,
      { statusCode: 200, payload },
      auditId,
    );
    res.json(payload);
  } catch (err) {
    if (isIdempotencyPayloadConflictError(err)) {
      sendApiError(res, 409, API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH, IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE);
      return;
    }
    const error = err as Error;
    logger.error('route.manifest_draft_revision_failed', {
      auditId,
      error: error.message,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
