import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

/**
 * `POST /api/audits/:id/brief/intelligence-wording` (B1 display phrasing, second LLM pass).
 */
export async function recordIntakeIntelligenceWordingKpi(args: {
  auditId: string | null;
  intakeTokenId?: string;
  labelOverrideKeyCount: number;
  allowedWordingIdCount: number;
  hintOverrideKeyCount: number;
  optionDisplayIdCount: number;
  llmError?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.intakeIntelligenceWording,
    message: 'Intake: intelligence wording (B1 label + hint + option display)',
    data: {
      intake_intelligence_wording: true,
      label_override_key_count: args.labelOverrideKeyCount,
      hint_override_key_count: args.hintOverrideKeyCount,
      option_display_id_count: args.optionDisplayIdCount,
      allowed_wording_id_count: args.allowedWordingIdCount,
      intake_token_id: args.intakeTokenId ?? null,
      ...(args.llmError ? { llm_error: args.llmError } : {}),
    },
  });
  if (error) {
    logger.warn('intake.intelligence_wording_kpi_insert_failed', {
      component: 'intake',
      message: error.message,
    });
  }
}
