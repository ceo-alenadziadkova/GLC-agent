import type { Response } from 'express';
import {
  API_ERROR_CODES,
  INTERNAL_SERVER_ERROR_MESSAGE,
  PLATFORM_ADMIN_ONLY_MESSAGE,
  PLATFORM_RECOMPUTE_IN_PROGRESS_MESSAGE,
  PLATFORM_RECOMPUTE_LOCK_UNAVAILABLE_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';

export function writePlatformAdminOnly(res: Response): void {
  res.status(403).json(apiErrorJson(API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE));
}

export function writePlatformRecomputeInProgress(res: Response): void {
  res
    .status(409)
    .json(apiErrorJson(API_ERROR_CODES.PLATFORM_RECOMPUTE_IN_PROGRESS, PLATFORM_RECOMPUTE_IN_PROGRESS_MESSAGE));
}

export function writePlatformRecomputeLockUnavailable(res: Response): void {
  res
    .status(503)
    .json(
      apiErrorJson(
        API_ERROR_CODES.PLATFORM_RECOMPUTE_LOCK_UNAVAILABLE,
        PLATFORM_RECOMPUTE_LOCK_UNAVAILABLE_MESSAGE,
      ),
    );
}

export function writePlatformInternalError(res: Response): void {
  res.status(500).json(apiErrorJson(API_ERROR_CODES.INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MESSAGE));
}
