import { describe, expect, it } from 'vitest';
import {
  AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE,
  isAuditChildRowsInitRollbackError,
} from '../lib/audit-init-error.js';

describe('isAuditChildRowsInitRollbackError', () => {
  it('matches base rollback message and variants (e.g. failed parent delete)', () => {
    expect(isAuditChildRowsInitRollbackError(new Error(AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE))).toBe(true);
    expect(
      isAuditChildRowsInitRollbackError(
        new Error(`${AUDIT_CHILD_ROWS_INIT_ROLLBACK_MESSAGE}: parent_audit_delete_failed (network)`),
      ),
    ).toBe(true);
    expect(isAuditChildRowsInitRollbackError(new Error('other'))).toBe(false);
    expect(isAuditChildRowsInitRollbackError(null)).toBe(false);
  });
});
