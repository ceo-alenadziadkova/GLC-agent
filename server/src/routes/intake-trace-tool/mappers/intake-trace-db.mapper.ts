import { REQUEST_FIELD_LIMITS } from '../../../config/request-field-limits.js';
import { INTAKE_TRACE_TOOL_ANALYTICS_SURFACE } from '../../../config/intake-trace-tool-surface.js';
import type { IntakeTraceToolAnalyticsBatchBody } from '../../../schemas/intake-trace-tool.js';
import type { WordingActionSourceRow, WordingDraftRow } from '../domain/wording-draft.types.js';

export type IntakeAnalyticsInsertRow = {
  surface: typeof INTAKE_TRACE_TOOL_ANALYTICS_SURFACE;
  event_type: string;
  client_session_id: string;
  user_id: string;
  audit_id: null;
  question_id: string | null;
  step_index: number | null;
  intake_versions: Record<string, unknown> | null;
  client_ts: string | null;
  payload: Record<string, unknown> | null;
};

export function buildAnalyticsInsertRows(
  body: IntakeTraceToolAnalyticsBatchBody,
  userId: string,
): IntakeAnalyticsInsertRow[] {
  const metaPayload = {
    ...(body.ia_v2_enabled !== undefined ? { ia_v2_enabled: body.ia_v2_enabled } : {}),
  };

  return body.events.map(eventItem => ({
    surface: INTAKE_TRACE_TOOL_ANALYTICS_SURFACE,
    event_type: eventItem.event_type,
    client_session_id: body.client_session_id,
    user_id: userId,
    audit_id: null,
    question_id:
      typeof eventItem.payload?.question_id === 'string'
        ? eventItem.payload.question_id.slice(0, REQUEST_FIELD_LIMITS.traceQuestionIdMax)
        : null,
    step_index:
      typeof eventItem.payload?.step_index === 'number' && Number.isFinite(eventItem.payload.step_index)
        ? Math.max(
            0,
            Math.min(REQUEST_FIELD_LIMITS.intakeAnalyticsStepIndexMax, Math.round(eventItem.payload.step_index)),
          )
        : null,
    intake_versions: Object.keys(metaPayload).length > 0 ? metaPayload : null,
    client_ts: eventItem.client_ts ?? null,
    payload: eventItem.payload && Object.keys(eventItem.payload).length > 0 ? eventItem.payload : null,
  }));
}

export function mapDraftRowsToMaps(rows: WordingDraftRow[]): {
  drafts: Record<string, string>;
  published: Record<string, string>;
} {
  const drafts: Record<string, string> = {};
  const published: Record<string, string> = {};
  for (const row of rows) {
    const questionId = row.question_id;
    if (!questionId) continue;
    if (typeof row.draft_text === 'string') drafts[questionId] = row.draft_text;
    if (typeof row.published_text === 'string' && row.published_text.trim().length > 0) {
      published[questionId] = row.published_text;
    }
  }
  return { drafts, published };
}

export function mapRowsToWordingActionTargets(rows: WordingActionSourceRow[]): Array<{ questionId: string; text: string }> {
  return rows
    .map(row => ({
      questionId: row.question_id ?? '',
      text: typeof row.source_text === 'string' ? row.source_text : '',
    }))
    .filter(row => row.questionId.length > 0)
    .filter(row => row.text.trim().length > 0);
}
