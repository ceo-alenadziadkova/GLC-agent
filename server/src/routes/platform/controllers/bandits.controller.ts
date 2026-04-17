import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { canActorManagePlatformSettings } from '../../../services/platform/platform-admin-access.service.js';
import {
  acquireBanditRecomputeLock,
  PlatformRecomputeLockUnavailableError,
  releaseBanditRecomputeLock,
} from '../../../services/platform/platform-recompute-lock.service.js';
import { recomputeBanditPerformance } from '../../../services/platform/platform-recompute.service.js';
import { banditRecomputeBodySchema } from '../validators/platform.schemas.js';
import {
  API_ERROR_CODES,
  PROFILE_PAYLOAD_INVALID_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import {
  writePlatformAdminOnly,
  writePlatformInternalError,
  writePlatformRecomputeLockUnavailable,
  writePlatformRecomputeInProgress,
} from '../http/platform-errors.js';

export async function postBanditRecomputeHandler(req: AuthRequest, res: Response) {
  let lockHandle: Awaited<ReturnType<typeof acquireBanditRecomputeLock>> | null = null;

  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }

    const parsed = banditRecomputeBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.PLATFORM_PAYLOAD_INVALID, PROFILE_PAYLOAD_INVALID_MESSAGE));
      return;
    }

    lockHandle = await acquireBanditRecomputeLock();
    if (!lockHandle) {
      writePlatformRecomputeInProgress(res);
      return;
    }

    const out = await recomputeBanditPerformance(parsed.data.phase_id, parsed.data.dry_run === true);
    res.json({ ok: true, ...out });
  } catch (error) {
    if (error instanceof PlatformRecomputeLockUnavailableError) {
      writePlatformRecomputeLockUnavailable(res);
      return;
    }
    logger.error('platform.bandit_recompute_failed', {
      component: 'platform_route',
      error: error instanceof Error ? error.message : String(error),
    });
    writePlatformInternalError(res);
  } finally {
    if (lockHandle) {
      try {
        await releaseBanditRecomputeLock(lockHandle);
      } catch (releaseError) {
        logger.warn('platform.bandit_recompute_lock_release_failed', {
          component: 'platform_route',
          error: releaseError instanceof Error ? releaseError.message : String(releaseError),
        });
      }
    }
  }
}
