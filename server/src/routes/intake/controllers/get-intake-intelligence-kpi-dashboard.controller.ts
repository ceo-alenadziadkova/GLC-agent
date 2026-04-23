import type { Request, Response } from 'express';

import { API_ERROR_CODES, INTERNAL_SERVER_ERROR_MESSAGE, apiErrorJson } from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { fetchIntakeIntelligenceKpiDashboard } from '../../../services/intake/intake-intelligence-kpi-dashboard.service.js';

export async function getIntakeIntelligenceKpiDashboardController(_req: Request, res: Response) {
  try {
    const dashboard = await fetchIntakeIntelligenceKpiDashboard();
    res.status(200).json({ ok: true, dashboard });
  } catch (err) {
    logger.error('route.intake_intelligence_kpi_dashboard_failed', { err });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTERNAL_SERVER_ERROR, INTERNAL_SERVER_ERROR_MESSAGE));
  }
}
