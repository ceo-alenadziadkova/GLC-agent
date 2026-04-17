import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_INVALID_TOKEN_MESSAGE,
  DISCOVER_LOAD_FAILED_MESSAGE,
  DISCOVER_SESSION_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { DISCOVER_SESSION_TOKEN_PATTERN } from '../../../config/discover-contract.js';
import { logger } from '../../../services/logger.js';
import { getDiscoverySessionPublicByToken } from '../services/discover-session.repository.js';
import { normalizeDiscoverRouteTokenParam } from '../validators/discover-route-input.validator.js';

export async function getDiscoverSessionByTokenController(req: Request, res: Response) {
  try {
    const token = normalizeDiscoverRouteTokenParam(req.params.token);
    if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
      return;
    }

    const { data: row, error } = await getDiscoverySessionPublicByToken(token);

    if (error || !row) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_SESSION_NOT_FOUND, DISCOVER_SESSION_NOT_FOUND_MESSAGE));
      return;
    }

    res.json(row);
  } catch (err) {
    logger.error('discover.load_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.DISCOVER_LOAD_FAILED, DISCOVER_LOAD_FAILED_MESSAGE));
  }
}
