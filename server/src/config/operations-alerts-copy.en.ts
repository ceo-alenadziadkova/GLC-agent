/**
 * Consultant-facing operational alert titles and bodies (English).
 * Wired through `emitStructuredNotification` — not HTTP user-facing API copy.
 */

export const operationsAlertTitlesEn = {
  auditInitRollbackDeleteFailed: 'Audit initialization rollback failed',
  recoverStalledPersistenceFailed: 'Stalled pipeline recovery write failed',
  freeSnapshotAuditStatusUpdateFailed: 'Free snapshot could not update audit status',
} as const;

export function formatAuditInitRollbackDeleteFailedMessageEn(input: { auditId: string; error: string }): string {
  return `Child row creation failed and CASCADE rollback could not DELETE audits row ${input.auditId}: ${input.error}. Orphaned rows may remain until manual cleanup.`;
}

export function formatRecoverStalledPersistenceFailedMessageEn(input: {
  failedOps: number;
  timeoutMinutes: number;
}): string {
  return `While recovering stalled pipelines (timeout ${input.timeoutMinutes}m), ${input.failedOps} Supabase write(s) failed (pipeline_events insert and/or audits status update across one or more audits). Check logs for pipeline.recover_stalled_* fields.`;
}

export function formatFreeSnapshotAuditStatusUpdateFailedMessageEn(input: {
  auditId: string;
  error: string;
}): string {
  return `After a free snapshot error, updating audits.status to failed did not succeed for audit ${input.auditId}: ${input.error}. The audit row may be inconsistent with pipeline_events.`;
}
