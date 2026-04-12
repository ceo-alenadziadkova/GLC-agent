/** Thrown when child rows (domains, reviews, etc.) fail after audit insert; parent row is deleted. */
export const AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE = 'Failed to initialize audit — rolled back';

export function isAuditChildRowsInitRollbackError(err: unknown): boolean {
  return err instanceof Error && err.message === AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE;
}
