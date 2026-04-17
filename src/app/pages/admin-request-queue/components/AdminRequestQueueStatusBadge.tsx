import type { AuditRequestStatus } from '../../../data/auditTypes';
import {
  ADMIN_REQUEST_QUEUE_STATUS,
} from '../../../config/admin-request-queue-copy.en';

export function AdminRequestQueueStatusBadge({ status }: { status: AuditRequestStatus }) {
  const { label, color } = ADMIN_REQUEST_QUEUE_STATUS[status] ?? ADMIN_REQUEST_QUEUE_STATUS.draft;
  return (
    <span className="text-xs font-medium" style={{ color }}>{label}</span>
  );
}
