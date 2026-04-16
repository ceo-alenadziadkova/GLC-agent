import { describe, expect, it } from 'vitest';
import {
  isApprovableAuditRequestStatus,
  isDeliverableAuditRequestStatus,
  isRejectableAuditRequestStatus,
  isUpdatableAuditRequestStatus,
} from '../audit-requests/domain/audit-request-status-policy.js';

describe('audit request status policy', () => {
  it('allows update only for draft and submitted', () => {
    expect(isUpdatableAuditRequestStatus('draft')).toBe(true);
    expect(isUpdatableAuditRequestStatus('submitted')).toBe(true);
    expect(isUpdatableAuditRequestStatus('approved')).toBe(false);
  });

  it('allows approve and reject for submitted and under_review', () => {
    expect(isApprovableAuditRequestStatus('submitted')).toBe(true);
    expect(isApprovableAuditRequestStatus('under_review')).toBe(true);
    expect(isApprovableAuditRequestStatus('draft')).toBe(false);

    expect(isRejectableAuditRequestStatus('submitted')).toBe(true);
    expect(isRejectableAuditRequestStatus('under_review')).toBe(true);
    expect(isRejectableAuditRequestStatus('approved')).toBe(false);
  });

  it('allows deliver for approved and running only', () => {
    expect(isDeliverableAuditRequestStatus('approved')).toBe(true);
    expect(isDeliverableAuditRequestStatus('running')).toBe(true);
    expect(isDeliverableAuditRequestStatus('rejected')).toBe(false);
  });
});
