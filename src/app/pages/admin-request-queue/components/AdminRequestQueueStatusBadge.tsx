import type { AuditRequestStatus } from '../../../data/auditTypes';
import { ADMIN_REQUEST_QUEUE_STATUS } from '../../../config/admin-request-queue-copy.en';
import { cn } from '../../../components/ui/utils';

const STATUS_BADGE_TEXT_CLASS: Record<AuditRequestStatus, string> = {
  draft: 'text-[var(--overlay-white-30)]',
  submitted: 'text-[var(--callout-warning-icon)]',
  under_review: 'text-[var(--glc-blue)]',
  approved: 'text-[var(--glc-green)]',
  rejected: 'text-[var(--score-1)]',
  running: 'text-[var(--glc-blue)]',
  delivered: 'text-[var(--glc-green)]',
};

export function AdminRequestQueueStatusBadge({ status }: { status: AuditRequestStatus }) {
  const { label } = ADMIN_REQUEST_QUEUE_STATUS[status] ?? ADMIN_REQUEST_QUEUE_STATUS.draft;
  return (
    <span className={cn('text-xs font-medium', STATUS_BADGE_TEXT_CLASS[status] ?? STATUS_BADGE_TEXT_CLASS.draft)}>
      {label}
    </span>
  );
}
