import { Router } from 'express';
import { getOrIssueSnapshotGuestToken } from '../../lib/guest-session.js';
import {
  getSnapshotPublicQuota,
  snapshotCompareLimiter,
  snapshotPublicLimiter,
} from '../../middleware/rate-limit.js';
import {
  API_ERROR_CODES,
  SNAPSHOT_CREATE_FAILED_MESSAGE,
  SNAPSHOT_FETCH_FAILED_MESSAGE,
  SNAPSHOT_INIT_ROLLBACK_MESSAGE,
  SNAPSHOT_QUOTA_READ_FAILED_MESSAGE,
  SNAPSHOT_START_FAILED_MESSAGE,
  apiErrorJson,
} from '../../config/api-error-codes.js';
import {
  SNAPSHOT_STARTED_NOTIFICATION_TITLE,
  snapshotStartedNotificationMessage,
} from '../../config/route-notification-messages.js';
import { buildPipelineUiRoute } from '../../config/route-notification-paths.js';
import { parseSnapshotToken } from '../../snapshot/validators/snapshot-token-validator.js';
import { pollSnapshotStatus } from '../../snapshot/services/snapshot-poll.service.js';
import { startSnapshotAudit } from '../../snapshot/services/snapshot-start.service.js';
import { launchSnapshotPipeline } from '../../snapshot/services/snapshot-launch.service.js';
import {
  markGuestSnapshotPollStatus,
  registerGuestSnapshotSession,
} from '../../snapshot/services/snapshot-guest-session.service.js';
import { emitStructuredNotification } from '../../services/notifications.js';
import { logger } from '../../services/logger.js';
import { startSnapshotBodySchema } from './validators/snapshot-route-input.validator.js';
import {
  sendPollSnapshotResult,
  sendSnapshotCompanyUrlRequired,
  sendSnapshotInvalidToken,
  sendStartSnapshotResult,
} from './mappers/snapshot-http.mapper.js';

export const snapshotPublicRouter = Router();

snapshotPublicRouter.get('/quota', async (req, res) => {
  try {
    const quota = await getSnapshotPublicQuota(req);
    res.json(quota);
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.quota_failed', { component: 'snapshot', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_QUOTA_READ_FAILED, SNAPSHOT_QUOTA_READ_FAILED_MESSAGE));
  }
});

snapshotPublicRouter.post('/', snapshotPublicLimiter, async (req, res) => {
  try {
    const parsedBody = startSnapshotBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendSnapshotCompanyUrlRequired(res);
      return;
    }

    const guestToken = getOrIssueSnapshotGuestToken(req, res);
    const startResult = await startSnapshotAudit(parsedBody.data.company_url);

    if (startResult.type === 'create_failed') {
      logger.error('snapshot.create_audit_failed', {
        component: 'snapshot',
        ...startResult.details,
      });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_CREATE_FAILED, SNAPSHOT_CREATE_FAILED_MESSAGE));
      return;
    }

    if (startResult.type === 'init_failed') {
      logger.error('snapshot.init_placeholders_failed', {
        component: 'snapshot',
        audit_id: startResult.auditId,
        init_errors: startResult.initErrors,
      });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_INIT_ROLLBACK, SNAPSHOT_INIT_ROLLBACK_MESSAGE));
      return;
    }

    sendStartSnapshotResult(res, startResult);

    if (startResult.type !== 'ok') return;

    await emitStructuredNotification({
      category: 'snapshot',
      event: 'snapshot_started',
      priority: 'medium',
      audience: 'consultants',
      auditId: startResult.auditId,
      title: SNAPSHOT_STARTED_NOTIFICATION_TITLE,
      message: snapshotStartedNotificationMessage(startResult.normalizedUrl),
      route: buildPipelineUiRoute(startResult.auditId),
      payload: {
        audit_id: startResult.auditId,
        company_url: startResult.normalizedUrl,
        actor_role: 'client',
      },
    });

    launchSnapshotPipeline(startResult.auditId);

    void registerGuestSnapshotSession({
      guestToken,
      snapshotToken: startResult.snapshotToken,
      companyUrl: startResult.normalizedUrl,
      req,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.post_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_START_FAILED, SNAPSHOT_START_FAILED_MESSAGE));
  }
});

snapshotPublicRouter.get('/:token', snapshotCompareLimiter, async (req, res) => {
  try {
    const snapshotToken = parseSnapshotToken(req.params.token);
    if (!snapshotToken) {
      sendSnapshotInvalidToken(res);
      return;
    }

    const pollResult = await pollSnapshotStatus({
      snapshotToken,
      compare: req.query.compare,
      includeCompetitor: req.query.include_competitor,
    });
    const responseType = sendPollSnapshotResult(res, snapshotToken, pollResult);
    if (responseType === 'failed') {
      void markGuestSnapshotPollStatus(snapshotToken, 'failed');
      return;
    }
    if (responseType === 'completed') {
      void markGuestSnapshotPollStatus(snapshotToken, 'completed');
    }
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.get_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_FETCH_FAILED, SNAPSHOT_FETCH_FAILED_MESSAGE));
  }
});
