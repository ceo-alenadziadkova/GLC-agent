import type { Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_DELETE_FAILED_MESSAGE,
  DISCOVER_INVALID_TOKEN_MESSAGE,
  DISCOVER_SESSION_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { DISCOVER_SESSION_TOKEN_PATTERN } from '../../../config/discover-contract.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { deleteDiscoverySessionForConsultant } from '../services/discover-session.repository.js';
import { normalizeDiscoverRouteTokenParam } from '../validators/discover-route-input.validator.js';

export async function deleteDiscoverSessionController(req: AuthRequest, res: Response) {
  try {
    const token = normalizeDiscoverRouteTokenParam(req.params.token);
    if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
      return;
    }

    const { data, error } = await deleteDiscoverySessionForConsultant(token, req.userId!);
    if (error) {
      logger.error('discover.delete_failed', { component: 'discover', error: error.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_DELETE_FAILED, DISCOVER_DELETE_FAILED_MESSAGE));
      return;
    }

    if (!data) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_SESSION_NOT_FOUND, DISCOVER_SESSION_NOT_FOUND_MESSAGE));
      return;
    }

    res.json({ deleted: true });
  } catch (err) {
    logger.error('discover.delete_exception', { component: 'discover', error: (err as Error).message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_DELETE_FAILED, DISCOVER_DELETE_FAILED_MESSAGE));
  }
}
