/**
 * Persist pipeline timeline events with observability trace fields.
 */

import { insertPipelineEventRow } from '../../services/pipeline/events/insert-pipeline-event.js';

export async function insertAgentPipelineEvent(params: {
  auditId: string;
  phase: number;
  eventType: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const { auditId, phase, eventType, message, data = {} } = params;
  await insertPipelineEventRow({
    auditId,
    phase,
    eventType,
    message,
    data,
  });
}
