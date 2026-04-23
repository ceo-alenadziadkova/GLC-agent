import type { Response } from 'express';

import { API_ERROR_CODES, AUDITS_NOT_FOUND_MESSAGE } from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  buildSprintExportRows,
  sprintExportToCsv,
} from '../../../services/orchestration/sprint-export.service.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { fetchLatestExecutionPackPayload } from '../../../services/strategy/strategy-execution-pack.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getOrchestrationSprintExportController(req: AuthRequest, res: Response) {
  try {
    const auditId = req.params.id as string;
    const userId = req.userId!;
    const formatRaw = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'json';
    const format = formatRaw === 'csv' ? 'csv' : 'json';
    const withExec = req.query.execution_pack !== '0';

    const persisted = await fetchPersistedGlcOrchestrationPackForUser({ auditId, userId });
    if (persisted.status === 'not_found') {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (persisted.status !== 'ok') {
      sendApiError(res, 500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, 'Failed to load orchestration pack');
      return;
    }
    if (!persisted.pack) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, 'No saved orchestration pack for this audit');
      return;
    }

    let executionPayload = null;
    if (withExec) {
      try {
        const latest = await fetchLatestExecutionPackPayload({ auditId, userId });
        executionPayload = latest?.payload ?? null;
      } catch {
        executionPayload = null;
      }
    }

    const rows = buildSprintExportRows({ pack: persisted.pack, executionPack: executionPayload });

    if (format === 'csv') {
      const csv = sprintExportToCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sprint-export-${auditId.slice(0, 8)}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      audit_id: auditId,
      orchestration_pack_version: persisted.orchestration_pack_version,
      rows,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('route.orchestration_sprint_export_failed', { error: e.message, stack: e.stack });
    sendApiError(res, 500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, 'Sprint export failed');
  }
}
