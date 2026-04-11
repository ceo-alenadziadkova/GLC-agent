import { Router } from 'express';
import { getPublicBrandConfig } from '../config/public-brand-config.js';

/**
 * Unauthenticated public config for marketing shell and white-label installs.
 */
export const publicBrandRouter = Router();

publicBrandRouter.get('/brand', (_req, res) => {
  res.json(getPublicBrandConfig());
});
