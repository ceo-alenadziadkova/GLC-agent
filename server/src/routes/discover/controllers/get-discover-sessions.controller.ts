import type { Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_LIST_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { mapDiscoverySessionListRow } from '../mappers/discover-sessions-list.mapper.js';
import { listDiscoverySessionsForConsultant } from '../services/discover-session.repository.js';

export async function getDiscoverSessionsController(req: AuthRequest, res: Response) {
  try {
    const { data, error } = await listDiscoverySessionsForConsultant(req.userId!);

    if (error) {
      logger.error('discover.list_failed', { component: 'discover', error: error.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_LIST_FAILED, DISCOVER_LIST_FAILED_MESSAGE));
      return;
    }

    const sessions = (data ?? []).map(row => mapDiscoverySessionListRow(row, req.userId!));

    res.json({ sessions });
  } catch (err) {
    logger.error('discover.list_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.DISCOVER_LIST_FAILED, DISCOVER_LIST_FAILED_MESSAGE));
  }
}
