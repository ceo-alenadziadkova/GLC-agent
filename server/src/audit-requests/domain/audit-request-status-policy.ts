import { AUDIT_REQUEST_STATUSES } from '../types.js';

const UPDATABLE_STATUSES = new Set<string>([
  AUDIT_REQUEST_STATUSES.draft,
  AUDIT_REQUEST_STATUSES.submitted,
]);

const APPROVABLE_STATUSES = new Set<string>([
  AUDIT_REQUEST_STATUSES.submitted,
  AUDIT_REQUEST_STATUSES.underReview,
]);

const REJECTABLE_STATUSES = APPROVABLE_STATUSES;

const DELIVERABLE_STATUSES = new Set<string>([
  AUDIT_REQUEST_STATUSES.approved,
  AUDIT_REQUEST_STATUSES.running,
]);

export function isUpdatableAuditRequestStatus(status: string): boolean {
  return UPDATABLE_STATUSES.has(status);
}

export function isApprovableAuditRequestStatus(status: string): boolean {
  return APPROVABLE_STATUSES.has(status);
}

export function isRejectableAuditRequestStatus(status: string): boolean {
  return REJECTABLE_STATUSES.has(status);
}

export function isDeliverableAuditRequestStatus(status: string): boolean {
  return DELIVERABLE_STATUSES.has(status);
}
