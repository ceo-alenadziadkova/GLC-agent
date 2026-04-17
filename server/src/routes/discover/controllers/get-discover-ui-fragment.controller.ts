import type { Request, Response } from 'express';

import { buildPublicDiscoveryUiFragment } from '@glc/intake-core';

import {
  API_ERROR_CODES,
  DISCOVER_UI_FRAGMENT_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';

export function getDiscoverUiFragmentController(_req: Request, res: Response) {
  try {
    res.json(buildPublicDiscoveryUiFragment());
  } catch (err) {
    logger.error('discover.ui_fragment_failed', {
      component: 'discover',
      error: (err as Error).message,
    });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_UI_FRAGMENT_FAILED, DISCOVER_UI_FRAGMENT_FAILED_MESSAGE));
  }
}
