import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { canActorManagePlatformSettings } from '../../../services/platform/platform-admin-access.service.js';
import { recomputeBenchmarkSnapshots } from '../../../services/platform/platform-recompute.service.js';
import { writePlatformAdminOnly, writePlatformInternalError } from '../http/platform-errors.js';

export async function postBenchmarkRecomputeHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }
    const out = await recomputeBenchmarkSnapshots();
    res.json({ ok: true, inserted: out.inserted });
  } catch (error) {
    logger.error('platform.benchmark_recompute_failed', {
      component: 'platform_route',
      error: error instanceof Error ? error.message : String(error),
    });
    writePlatformInternalError(res);
  }
}
