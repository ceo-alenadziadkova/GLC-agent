import type { Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_CONVERT_FAILED_MESSAGE,
  DISCOVER_INVALID_TOKEN_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { DISCOVER_SESSION_TOKEN_PATTERN } from '../../../config/discover-contract.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { convertDiscoverySessionToAudit } from '../services/discover-convert.service.js';
import { normalizeDiscoverRouteTokenParam } from '../validators/discover-route-input.validator.js';

export async function postDiscoverConvertController(req: AuthRequest, res: Response) {
  try {
    const token = normalizeDiscoverRouteTokenParam(req.params.token);
    if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
      return;
    }

    const { status, body } = await convertDiscoverySessionToAudit(token, req.userId!);
    res.status(status).json(body);
  } catch (err) {
    logger.error('discover.convert_exception', { component: 'discover', error: (err as Error).message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE));
  }
}
