import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
} from '../../../config/api-error-codes.js';
import { idempotencyPostAuditsOrchestrationSelectedInitiativeKey } from '../../../config/api-http-paths.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchLatestRoadmapManifestSnapshotIdForAudit } from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { executePostOrchestrationPack } from './post-orchestration-pack.controller.js';

const BodySchema = z.object({
  action_id: z.string().min(1),
});

/**
 * Lightweight UX alias: persist initiative preference without exposing manifest snapshot plumbing.
 * Internally reuses POST orchestration pack flow to keep governance/idempotency behavior aligned.
 */
export async function postSelectedInitiativeController(req: AuthRequest, res: Response) {
  const parsedBody = BodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    sendApiError(
      res,
      400,
      API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID,
      AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
      { detail: parsedBody.error.flatten() },
    );
    return;
  }

  const auditId = req.params.id as string;
  const latestSnapshot = await fetchLatestRoadmapManifestSnapshotIdForAudit({ auditId });
  if (!latestSnapshot) {
    sendApiError(
      res,
      409,
      API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY,
      AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
      { not_ready_reason_code: 'manifest_snapshot_missing' },
    );
    return;
  }

  const forwardedReq = {
    ...req,
    body: {
      manifest_snapshot_id: latestSnapshot.id,
      selected_action_ids: [parsedBody.data.action_id],
    },
  } as AuthRequest;
  await executePostOrchestrationPack(
    forwardedReq,
    res,
    idempotencyPostAuditsOrchestrationSelectedInitiativeKey(auditId),
  );
}
