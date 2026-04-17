import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_ANSWERS_REQUIRED_MESSAGE,
  DISCOVER_FINDINGS_REQUIRED_MESSAGE,
  DISCOVER_MATURITY_INVALID_MESSAGE,
  DISCOVER_SAVE_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import {
  createContactEditKey,
  hashContactEditKey,
} from '../services/discover-contact-edit-key.service.js';
import { insertDiscoverySession } from '../services/discover-session.repository.js';
import { safeParsePostDiscoverSessionBody } from '../validators/discover-route-input.validator.js';

export async function postDiscoverSessionController(req: Request, res: Response) {
  try {
    const parsed = safeParsePostDiscoverSessionBody(req.body);
    if (!parsed.success) {
      const path0 = parsed.error.issues[0]?.path[0];
      if (path0 === 'maturity_level') {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_MATURITY_INVALID, DISCOVER_MATURITY_INVALID_MESSAGE));
        return;
      }
      if (path0 === 'findings') {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_FINDINGS_REQUIRED, DISCOVER_FINDINGS_REQUIRED_MESSAGE));
        return;
      }
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_ANSWERS_REQUIRED, DISCOVER_ANSWERS_REQUIRED_MESSAGE));
      return;
    }

    const { answers, maturity_level, findings } = parsed.data;
    const contactEditKey = createContactEditKey();
    const contactEditKeyHash = await hashContactEditKey(contactEditKey);
    const { data: row, error } = await insertDiscoverySession({
      answers,
      maturity_level,
      findings,
      contact_edit_key_hash: contactEditKeyHash,
    });

    if (error || !row) {
      logger.error('discover.save_failed', { component: 'discover', error: error?.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_SAVE_FAILED, DISCOVER_SAVE_FAILED_MESSAGE));
      return;
    }

    res.status(201).json({
      token: row.session_token,
      created_at: row.created_at,
      contact_edit_key: contactEditKey,
    });
  } catch (err) {
    logger.error('discover.save_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.DISCOVER_SAVE_FAILED, DISCOVER_SAVE_FAILED_MESSAGE));
  }
}
