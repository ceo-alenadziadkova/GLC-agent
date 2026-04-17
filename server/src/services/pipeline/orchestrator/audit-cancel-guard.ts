import { PIPELINE_AUDIT_ORCHESTRATOR_STATUS } from '../../../config/pipeline-status.js';
import { supabase } from '../../supabase.js';
import { PipelineCancelledError } from './pipeline-cancelled.error.js';

export async function updateAuditIfNotCancelled(
  auditId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const { data: audit } = await supabase.from('audits').select('status').eq('id', auditId).single();
  if (audit?.status === PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled) {
    return false;
  }
  const { error } = await supabase.from('audits').update(patch).eq('id', auditId);
  return !error;
}

export async function assertAuditNotCancelled(auditId: string): Promise<void> {
  const { data } = await supabase.from('audits').select('status').eq('id', auditId).single();
  if (data?.status === PIPELINE_AUDIT_ORCHESTRATOR_STATUS.cancelled) {
    throw new PipelineCancelledError();
  }
}
