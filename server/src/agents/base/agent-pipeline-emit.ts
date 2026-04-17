/**
 * Persist pipeline timeline events with observability trace fields.
 */

import { supabase } from '../../services/supabase.js';
import { getContext, updateContext } from '../../services/observability-context.js';

export async function insertAgentPipelineEvent(params: {
  auditId: string;
  phase: number;
  eventType: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const { auditId, phase, eventType, message, data = {} } = params;
  updateContext({ auditId });
  const ctx = getContext();
  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase,
    event_type: eventType,
    message,
    data: {
      ...data,
      trace_id: ctx?.traceId,
      operation_id: ctx?.operationId,
    },
  });
}
