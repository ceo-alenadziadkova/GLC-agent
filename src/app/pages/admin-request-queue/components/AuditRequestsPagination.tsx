import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';

type Props = {
  rangeFrom: number;
  rangeTo: number;
  total: number;
  pageOffset: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
};

export function AuditRequestsPagination({
  rangeFrom,
  rangeTo,
  total,
  pageOffset,
  limit,
  onPrev,
  onNext,
}: Props) {
  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4"
      aria-label={ADMIN_REQUEST_QUEUE_COPY.auditRequestsPaginationLabel}
    >
      <p className="m-0 text-xs text-[var(--text-tertiary)]">
        {ADMIN_REQUEST_QUEUE_COPY.paginationRange(rangeFrom, rangeTo, total)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="glc-touch-target rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-45 sm:min-h-0 sm:py-1.5"
          disabled={pageOffset <= 0}
          onClick={onPrev}
        >
          {ADMIN_REQUEST_QUEUE_COPY.paginationPrev}
        </button>
        <button
          type="button"
          className="glc-touch-target rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] disabled:opacity-45 sm:min-h-0 sm:py-1.5"
          disabled={pageOffset + limit >= total}
          onClick={onNext}
        >
          {ADMIN_REQUEST_QUEUE_COPY.paginationNext}
        </button>
      </div>
    </nav>
  );
}
