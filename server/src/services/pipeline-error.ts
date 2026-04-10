import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { notifyAuditParticipants } from './notifications.js';

async function fallbackWritePipelineError(auditId: string, phase: number, err: Error): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
  const base = `${supabaseUrl}/rest/v1`;
  const payload = {
    audit_id: auditId,
    phase,
    event_type: 'error',
    message: err.message ?? 'Phase failed unexpectedly',
    data: { error: err.message, source: 'fallback_rest' },
  };
  await fetch(`${base}/pipeline_events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  await fetch(`${base}/audits?id=eq.${encodeURIComponent(auditId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'failed' }),
  });
}

export async function emitPhaseErrorDurable(auditId: string, phase: number, err: Error): Promise<void> {
  logger.error('Pipeline phase crashed', { audit_id: auditId, phase, error: err.message });
  try {
    await Promise.all([
      supabase.from('pipeline_events').insert({
        audit_id: auditId,
        phase,
        event_type: 'error',
        message: err.message ?? 'Phase failed unexpectedly',
        data: { error: err.message, stack: err.stack?.split('\n')[1]?.trim() ?? '' },
      }),
      supabase.from('audits')
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

  await notifyAuditParticipants(
    auditId,
    'pipeline',
    'Pipeline failure',
    err.message ?? 'Pipeline phase failed unexpectedly',
    {
      phase,
      status: 'failed',
      route: `/pipeline/${auditId}`,
      occurred_at: new Date().toISOString(),
      actor_role: 'system',
      failure_type: 'phase_failed',
    },
  );
}

