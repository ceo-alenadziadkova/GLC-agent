import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { canActorManagePlatformSettings } from '../../../services/platform/platform-admin-access.service.js';
import {
  getSelfServeOwnerView,
  isConsultantProfile,
  updateStoredOwnerAndResolve,
} from '../../../services/platform/platform-owner.service.js';
import {
  API_ERROR_CODES,
  PLATFORM_OWNER_NOT_CONSULTANT_MESSAGE,
  PLATFORM_OWNER_REQUIRED_MESSAGE,
  PLATFORM_OWNER_UUID_INVALID_MESSAGE,
  PLATFORM_SELF_SERVE_LOAD_FAILED_MESSAGE,
  PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE,
  PLATFORM_SELF_SERVE_UPDATE_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { safeParseSelfServeOwnerPatchBody } from '../validators/platform.schemas.js';
import { writePlatformAdminOnly } from '../http/platform-errors.js';

export async function getSelfServeOwnerHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    const canManage = await canActorManagePlatformSettings(uid);
    const view = await getSelfServeOwnerView(uid, canManage);
    res.json(view);
  } catch {
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_LOAD_FAILED, PLATFORM_SELF_SERVE_LOAD_FAILED_MESSAGE));
  }
}

export async function patchSelfServeOwnerHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }

    if (!req.body || typeof req.body !== 'object' || !('owner_user_id' in (req.body as object))) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.PLATFORM_OWNER_REQUIRED, PLATFORM_OWNER_REQUIRED_MESSAGE));
      return;
    }

    const parsed = safeParseSelfServeOwnerPatchBody(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PLATFORM_OWNER_UUID_INVALID, PLATFORM_OWNER_UUID_INVALID_MESSAGE));
      return;
    }

    if (parsed.data.ownerUserId && !(await isConsultantProfile(parsed.data.ownerUserId))) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PLATFORM_OWNER_NOT_CONSULTANT, PLATFORM_OWNER_NOT_CONSULTANT_MESSAGE));
      return;
    }

    const updated = await updateStoredOwnerAndResolve(parsed.data.ownerUserId, uid);
    if (!updated.ok) {
      res
        .status(updated.statusCode)
        .json(
          apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_PERSIST_FAILED, PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE),
        );
      return;
    }

    res.json(updated.payload);
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_UPDATE_FAILED, PLATFORM_SELF_SERVE_UPDATE_FAILED_MESSAGE),
      );
  }
}
