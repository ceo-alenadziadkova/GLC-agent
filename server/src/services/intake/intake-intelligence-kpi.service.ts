import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

export type IntakeIntelligenceKpiKind =
  | 'question_shown'
  | 'drop_off'
  | 'fast_pass_started'
  | 'fast_pass_completed'
  | 'precision_pass_started'
  | 'optional_details_opened'
  | 'optional_details_submitted';

/**
 * Persists diagnostic intake KPI rows into `pipeline_events` when the token is linked to an audit.
 * If token is not linked yet, stores a pre-audit telemetry row with a synthetic event type.
 */
export async function recordIntakeIntelligenceKpiEvent(params: {
  auditId: string | null;
  intakeTokenId?: string;
  consultantId?: string;
  kind: IntakeIntelligenceKpiKind;
  questionId?: string;
  clientSessionId?: string;
}): Promise<{ persisted: boolean }> {
  const eventType = params.auditId
    ? params.kind === 'drop_off'
      ? PIPELINE_EVENT_TYPES.intakeIntelligenceDropOff
      : PIPELINE_EVENT_TYPES.intakeIntelligenceQuestionShown
    : 'intake_intelligence_pre_audit_kpi';
  const message = params.auditId
    ? params.kind === 'drop_off'
      ? 'Public intake: session drop-off signal (intelligence KPI)'
      : params.kind === 'question_shown'
      ? 'Public intake: question became visible (intelligence KPI)'
      : `Public intake: ${params.kind} signal (intelligence KPI)`
    : 'Public intake: pre-audit KPI signal captured';

  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: params.auditId,
    phase: 0,
    event_type: eventType,
    message,
    data: {
      intake_intelligence_kpi: true,
      kind: params.kind,
      question_id: params.questionId ?? null,
      client_session_id: params.clientSessionId ?? null,
      intake_token_id: params.intakeTokenId ?? null,
      consultant_id: params.consultantId ?? null,
      pre_audit: !params.auditId,
    },
  });
  if (error) {
    logger.warn('intake.intelligence_kpi_insert_failed', {
      component: 'intake',
      auditId: params.auditId,
      kind: params.kind,
      message: error.message,
    });
    return { persisted: false };
  }
  return { persisted: true };
}
