import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { canActorManagePlatformSettings } from '../../../services/platform/platform-admin-access.service.js';
import {
  getPlatformRuntimePolicyView,
  patchPlatformRuntimePolicy,
} from '../../../services/platform/platform-runtime-policy.service.js';
import {
  API_ERROR_CODES,
  PLATFORM_SELF_SERVE_LOAD_FAILED_MESSAGE,
  PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE,
  PLATFORM_SELF_SERVE_UPDATE_FAILED_MESSAGE,
  PROFILE_PAYLOAD_INVALID_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { safeParseRuntimePolicyPatch } from '../validators/platform.schemas.js';
import { writePlatformAdminOnly } from '../http/platform-errors.js';

export async function getRuntimePoliciesHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }
    const data = await getPlatformRuntimePolicyView();
    res.json(data);
  } catch {
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_LOAD_FAILED, PLATFORM_SELF_SERVE_LOAD_FAILED_MESSAGE));
  }
}

export async function patchRuntimePoliciesHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }

    const parsed = safeParseRuntimePolicyPatch(req.body);
    if (!parsed.success) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.PLATFORM_PAYLOAD_INVALID, PROFILE_PAYLOAD_INVALID_MESSAGE));
      return;
    }

    const updated = await patchPlatformRuntimePolicy(parsed.data, uid);
    if (!updated.ok) {
      res
        .status(updated.statusCode)
        .json(
          apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_PERSIST_FAILED, PLATFORM_SELF_SERVE_PERSIST_FAILED_MESSAGE),
        );
      return;
    }
    const data = await getPlatformRuntimePolicyView();
    res.json({ ok: true, ...data });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.PLATFORM_SELF_SERVE_UPDATE_FAILED, PLATFORM_SELF_SERVE_UPDATE_FAILED_MESSAGE),
      );
  }
}
