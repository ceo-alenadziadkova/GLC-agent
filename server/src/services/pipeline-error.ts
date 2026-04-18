import {
  AUDITS_TABLE,
  PIPELINE_EVENTS_TABLE,
  PIPELINE_PHASE_ERROR_DEFAULT_MESSAGE,
  PIPELINE_PHASE_NOTIFICATION_FALLBACK_MESSAGE,
} from '../config/pipeline-error-fallback.js';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { getSupabaseServiceRestConfig } from '../config/supabase-service-env.js';
import { PIPELINE_PHASE_FAILED_NOTIFICATION_TITLE } from '../config/route-notification-messages.js';
import { buildPipelineUiRoute } from '../config/route-notification-paths.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { emitStructuredNotification } from './notifications.js';

async function fallbackWritePipelineError(auditId: string, phase: number, err: Error): Promise<void> {
  const cfg = getSupabaseServiceRestConfig();
  if (!cfg) return;

  const headers = {
    apikey: cfg.serviceKey,
    Authorization: `Bearer ${cfg.serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
  const base = cfg.restBase;
  const payload = {
    audit_id: auditId,
    phase,
    event_type: PIPELINE_EVENT_TYPES.error,
    message: err.message ?? PIPELINE_PHASE_ERROR_DEFAULT_MESSAGE,
    data: { error: err.message, source: 'fallback_rest' },
  };
  await fetch(`${base}/${PIPELINE_EVENTS_TABLE}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  await fetch(`${base}/${AUDITS_TABLE}?id=eq.${encodeURIComponent(auditId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'failed' }),
  });
}

export async function emitPhaseErrorDurable(auditId: string, phase: number, err: Error): Promise<void> {
  logger.error('Pipeline phase crashed', { audit_id: auditId, phase, error: err.message });
  try {
    await Promise.all([
      supabase.from(PIPELINE_EVENTS_TABLE).insert({
        audit_id: auditId,
        phase,
        event_type: PIPELINE_EVENT_TYPES.error,
        message: err.message ?? PIPELINE_PHASE_ERROR_DEFAULT_MESSAGE,
        data: { error: err.message, stack: err.stack?.split('\n')[1]?.trim() ?? '' },
      }),
      supabase.from(AUDITS_TABLE)
        .update({ status: 'failed' })
        .eq('id', auditId),
    ]);
  } catch (dbErr) {
    logger.error('Failed to write pipeline error event', {
      audit_id: auditId,
      phase,
      error: (dbErr as Error).message,
      fallback: 'supabase_rest',
    });
    try {
      await fallbackWritePipelineError(auditId, phase, err);
    } catch (fallbackErr) {
      logger.error('Pipeline error fallback write failed', {
        audit_id: auditId,
        phase,
        error: (fallbackErr as Error).message,
      });
    }
  }

  await emitStructuredNotification({
    category: 'pipeline',
    event: 'pipeline_phase_failed',
    priority: 'critical',
    audience: 'audit_participants',
    auditId,
    title: PIPELINE_PHASE_FAILED_NOTIFICATION_TITLE,
    message: err.message ?? PIPELINE_PHASE_NOTIFICATION_FALLBACK_MESSAGE,
    route: buildPipelineUiRoute(auditId),
    payload: {
      phase,
      status: 'failed',
      actor_role: 'system',
      failure_type: 'phase_failed',
    },
  });
}

