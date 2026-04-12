import { supabase } from '../services/supabase.js';
import { logger } from '../services/logger.js';
import type { ExecutionMode } from '../schemas/control-object.js';

/**
 * Loads `audits.execution_mode` for CONTROL_OBJECT.context.
 * Returns `normal` if the row is missing, the column is absent (pre-migration), or on error.
 */
export async function fetchAuditExecutionMode(auditId: string): Promise<ExecutionMode> {
  try {
    const { data, error } = await supabase
      .from('audits')
      .select('execution_mode')
      .eq('id', auditId)
      .maybeSingle();

    if (error) {
      logger.warn('audit.execution_mode_fetch_failed', {
        component: 'audit_execution_mode',
        audit_id: auditId,
        message: error.message,
      });
      return 'normal';
    }

    const row = data as { execution_mode?: string } | null;
    return row?.execution_mode === 'safe' ? 'safe' : 'normal';
  } catch (err) {
    logger.warn('audit.execution_mode_fetch_exception', {
      component: 'audit_execution_mode',
      audit_id: auditId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'normal';
  }
}
