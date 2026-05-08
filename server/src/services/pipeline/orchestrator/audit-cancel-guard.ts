import { PIPELINE_AUDIT_ORCHESTRATOR_STATUS } from '../../../config/pipeline-status.js';
import { logger } from '../../logger.js';
import { supabase } from '../../supabase.js';
import { PipelineCancelledError } from './pipeline-cancelled.error.js';

/**
 * Conditional update that respects an in-flight cancellation in a single round-trip.
 * Returns `false` when the audit is already `cancelled` (no rows matched the `neq` filter)
 * so the caller can short-circuit without overwriting the cancelled state.
 *
 * Replaces the previous read-then-write pattern, which had a TOCTOU window where a cancel
 * landing between the `select` and the `update` could be silently overwritten.
 */
export async function updateAuditIfNotCancelled(
  auditId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('audits')
    .update(patch)
    .eq('id', auditId)
    .neq('status', PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled)
    .select('id');
  if (error) {
    logger.error('audit.update_failed', {
      component: 'pipeline',
      audit_id: auditId,
      message: error.message,
    });
    throw new Error(`Failed to update audit: ${error.message}`);
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Throws `PipelineCancelledError` when the audit is currently `cancelled`.
 * Read failures throw a generic error so the orchestrator does not proceed under uncertainty
 * (previous behaviour silently treated transient read failure as "not cancelled").
 */
export async function assertAuditNotCancelled(auditId: string): Promise<void> {
  const { data, error } = await supabase.from('audits').select('status').eq('id', auditId).single();
  if (error) {
    logger.error('audit.cancel_check_failed', {
      component: 'pipeline',
      audit_id: auditId,
      error: error.message,
      code: error.code,
    });
    throw new Error(`Failed to verify audit cancel state: ${error.message}`);
  }
  if (data?.status === PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled) {
    throw new PipelineCancelledError();
  }
}
