import type { ReportProfile } from '@glc/intake-core';
import { api } from '../../../data/apiService';
import { logger } from '../../../lib/logger';

export async function downloadReportPdf(auditId: string, profile: ReportProfile): Promise<void> {
  try {
    await api.downloadReportPdf(auditId, profile);
  } catch (error) {
    logger.error('[ReportViewer] export PDF failed', {
      error: error instanceof Error ? error.message : String(error),
      auditId,
      profile,
    });
    throw error;
  }
}

export async function downloadReportCsv(auditId: string, profile: ReportProfile): Promise<void> {
  try {
    await api.downloadReportCsv(auditId, profile);
  } catch (error) {
    logger.error('[ReportViewer] export CSV failed', {
      error: error instanceof Error ? error.message : String(error),
      auditId,
      profile,
    });
    throw error;
  }
}
