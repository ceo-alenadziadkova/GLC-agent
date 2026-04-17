import { Router } from 'express';
import {
  API_ERROR_CODES,
  SNAPSHOT_HOST_REQUIRED_MESSAGE,
  SNAPSHOT_METRICS_FAILED_MESSAGE,
  SNAPSHOT_PURGE_FAILED_MESSAGE,
  SNAPSHOT_RESOURCE_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../config/api-error-codes.js';
import { deleteSnapshotDomainCache } from '../../snapshot/cache.js';
import { getSnapshotMetricsSnapshot } from '../../snapshot/snapshot-metrics.js';
import { getSnapshotSharedMetricsForOperator } from '../../snapshot/snapshot-operator-metrics-shared.js';
import { logger } from '../../services/logger.js';
import { isSnapshotOperatorAuthorized } from '../../snapshot/services/snapshot-operator-auth.service.js';
import { operatorPurgeCacheBodySchema } from './validators/snapshot-route-input.validator.js';

export const snapshotOperatorRouter = Router();

snapshotOperatorRouter.get('/metrics', async (req, res) => {
  if (!isSnapshotOperatorAuthorized(req)) {
    res
      .status(404)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_RESOURCE_NOT_FOUND, SNAPSHOT_RESOURCE_NOT_FOUND_MESSAGE));
    return;
  }
  try {
    const shared = await getSnapshotSharedMetricsForOperator();
    res.json({ ...getSnapshotMetricsSnapshot(), ...shared });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.operator_metrics_failed', { component: 'snapshot', error: e.message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_METRICS_FAILED, SNAPSHOT_METRICS_FAILED_MESSAGE));
  }
});

snapshotOperatorRouter.post('/purge-cache', async (req, res) => {
  if (!isSnapshotOperatorAuthorized(req)) {
    res
      .status(404)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_RESOURCE_NOT_FOUND, SNAPSHOT_RESOURCE_NOT_FOUND_MESSAGE));
    return;
  }

  const parsedBody = operatorPurgeCacheBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_HOST_REQUIRED, SNAPSHOT_HOST_REQUIRED_MESSAGE));
    return;
  }

  try {
    const ok = await deleteSnapshotDomainCache(parsedBody.data.host);
    res.json({ ok });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.operator_purge_failed', { component: 'snapshot', error: e.message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_PURGE_FAILED, SNAPSHOT_PURGE_FAILED_MESSAGE));
  }
});
