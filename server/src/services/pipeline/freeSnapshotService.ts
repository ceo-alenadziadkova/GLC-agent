import { pipelineOrchestratorCopy } from '../../config/pipeline-orchestrator-copy.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { PIPELINE_EVENT_ERROR_CODES } from '../../config/pipeline-event-error-codes.js';
import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
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

    await supabase.from('audits').update({ status: 'recon', current_phase: 0 }).eq('id', auditId);
    await emitEvent(0, PIPELINE_EVENT_TYPES.started, ocFs.freeSnapshot.started);

    const { preview } = await runDeterministicSnapshot(auditId);

    await emitEvent(4, PIPELINE_EVENT_TYPES.completed, ocFs.freeSnapshot.completed);
    logger.info('Free snapshot completed', { audit_id: auditId });

    return preview;
  } catch (err) {
    const error = err as Error;

    if (error instanceof SnapshotAtCapacityError) {
      logger.warn('Free snapshot capacity', { audit_id: auditId });
      await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId);
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

    await supabase.from('audits').update({ status: 'failed' }).eq('id', auditId);
    await emitEvent(0, PIPELINE_EVENT_TYPES.error, ocFs.freeSnapshot.errorGeneric, {
      error_code: PIPELINE_EVENT_ERROR_CODES.FREE_SNAPSHOT_FAILED,
    });
    throw err;
  }
}

