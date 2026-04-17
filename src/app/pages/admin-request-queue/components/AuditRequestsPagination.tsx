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
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
      style={{ borderColor: 'var(--border-subtle)' }}
      aria-label={ADMIN_REQUEST_QUEUE_COPY.auditRequestsPaginationLabel}
    >
      <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
        {ADMIN_REQUEST_QUEUE_COPY.paginationRange(rangeFrom, rangeTo, total)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded-lg text-xs font-medium glc-touch-target sm:min-h-0 sm:py-1.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            opacity: pageOffset <= 0 ? 0.45 : 1,
          }}
          disabled={pageOffset <= 0}
          onClick={onPrev}
        >
          {ADMIN_REQUEST_QUEUE_COPY.paginationPrev}
        </button>
        <button
          type="button"
          className="px-3 py-2 rounded-lg text-xs font-medium glc-touch-target sm:min-h-0 sm:py-1.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            opacity: pageOffset + limit >= total ? 0.45 : 1,
          }}
          disabled={pageOffset + limit >= total}
          onClick={onNext}
        >
          {ADMIN_REQUEST_QUEUE_COPY.paginationNext}
        </button>
      </div>
    </nav>
  );
}
