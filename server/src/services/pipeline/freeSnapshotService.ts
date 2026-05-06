import {
  formatFreeSnapshotAuditStatusUpdateFailedMessageEn,
  operationsAlertTitlesEn,
} from '../../config/operations-alerts-copy.en.js';
import { pipelineOrchestratorCopy } from '../../config/pipeline-orchestrator-copy.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { PIPELINE_EVENT_ERROR_CODES } from '../../config/pipeline-event-error-codes.js';
import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
import { emitStructuredNotification } from '../notifications.js';
import { runDeterministicSnapshot } from '../../snapshot/run-snapshot.js';
import { SnapshotAtCapacityError } from '../../snapshot/abuse-guards.js';
import type { FreeSnapshotPreview } from '../../types/audit.js';

export type RunFreeSnapshotServiceDeps = {
  auditId: string;
  emitEvent: (phase: number, eventType: string, message: string, data?: Record<string, unknown>) => Promise<void>;
};

export async function runFreeSnapshotService(deps: RunFreeSnapshotServiceDeps): Promise<FreeSnapshotPreview> {
  const { auditId, emitEvent } = deps;
  const ocFs = pipelineOrchestratorCopy();

  try {
    logger.info('Free snapshot started', { audit_id: auditId });

    const { error: startStatusErr } = await supabase
      .from('audits')
      .update({ status: 'recon', current_phase: 0 })
      .eq('id', auditId);
    if (startStatusErr) {
      logger.error('free_snapshot.audit_mark_recon_failed', {
        audit_id: auditId,
        error: startStatusErr.message,
      });
      throw startStatusErr;
    }
    await emitEvent(0, PIPELINE_EVENT_TYPES.started, ocFs.freeSnapshot.started);

    const { preview } = await runDeterministicSnapshot(auditId);

    await emitEvent(4, PIPELINE_EVENT_TYPES.completed, ocFs.freeSnapshot.completed);
    logger.info('Free snapshot completed', { audit_id: auditId });

    return preview;
  } catch (err) {
    const error = err as Error;

    if (error instanceof SnapshotAtCapacityError) {
      logger.warn('Free snapshot capacity', { audit_id: auditId });
      const { error: capFailErr } = await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId);
      if (capFailErr) {
        logger.error('free_snapshot.audit_mark_failed_after_capacity', {
          audit_id: auditId,
          error: capFailErr.message,
          code: capFailErr.code,
        });
        await emitStructuredNotification({
          category: 'system',
          event: 'free_snapshot_audit_status_update_failed',
          priority: 'critical',
          audience: 'consultants',
          title: operationsAlertTitlesEn.freeSnapshotAuditStatusUpdateFailed,
          message: formatFreeSnapshotAuditStatusUpdateFailedMessageEn({
            auditId,
            error: capFailErr.message,
          }),
          auditId,
          payload: { audit_id: auditId, context: 'snapshot_at_capacity' },
          sendInApp: true,
          sendTelegram: true,
        }).catch((notifyErr) => {
          logger.error('free_snapshot.status_alert_emit_failed', {
            audit_id: auditId,
            error: (notifyErr as Error).message,
          });
        });
      }
      await emitEvent(0, PIPELINE_EVENT_TYPES.error, ocFs.freeSnapshot.errorCapacity, {
        error_code: PIPELINE_EVENT_ERROR_CODES.SNAPSHOT_AT_CAPACITY,
      });
      throw err;
    }

    logger.error('Free snapshot failed', {
      audit_id: auditId,
      error: error.message,
      stack: error.stack,
    });

    const { error: genFailErr } = await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId);
    if (genFailErr) {
      logger.error('free_snapshot.audit_mark_failed_after_error', {
        audit_id: auditId,
        error: genFailErr.message,
        code: genFailErr.code,
      });
      await emitStructuredNotification({
        category: 'system',
        event: 'free_snapshot_audit_status_update_failed',
        priority: 'critical',
        audience: 'consultants',
        title: operationsAlertTitlesEn.freeSnapshotAuditStatusUpdateFailed,
        message: formatFreeSnapshotAuditStatusUpdateFailedMessageEn({
          auditId,
          error: genFailErr.message,
        }),
        auditId,
        payload: {
          audit_id: auditId,
          context: 'generic_failure',
          original_error: error.message,
        },
        sendInApp: true,
        sendTelegram: true,
      }).catch((notifyErr) => {
        logger.error('free_snapshot.status_alert_emit_failed', {
          audit_id: auditId,
          error: (notifyErr as Error).message,
        });
      });
    }
    await emitEvent(0, PIPELINE_EVENT_TYPES.error, ocFs.freeSnapshot.errorGeneric, {
      error_code: PIPELINE_EVENT_ERROR_CODES.FREE_SNAPSHOT_FAILED,
    });
    throw err;
  }
}

