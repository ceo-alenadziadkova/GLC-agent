import type { IntakeTraceToolAnalyticsBatchBody } from '../../../schemas/intake-trace-tool.js';
import { buildAnalyticsInsertRows } from '../mappers/intake-trace-db.mapper.js';
import { insertAnalyticsRows } from '../repositories/intake-trace-analytics.repository.js';

export async function storeIntakeTraceAnalytics(
  body: IntakeTraceToolAnalyticsBatchBody,
  userId: string,
): Promise<{ received: number }> {
  const rows = buildAnalyticsInsertRows(body, userId);
  await insertAnalyticsRows(rows);
  return { received: rows.length };
}
