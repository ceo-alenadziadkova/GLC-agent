import {
  ADMIN_REQUEST_QUEUE_CHROME,
  ADMIN_REQUEST_QUEUE_COPY,
} from '../../../config/admin-request-queue-copy.en';
import type { AdminQueueFilter } from '../hooks/useAdminRequestQueue';

type Props = {
  filter: AdminQueueFilter;
  onFilterChange: (f: AdminQueueFilter) => void;
};

export function AdminRequestQueueFilters({ filter, onFilterChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['pending', 'all'] as const).map(f => (
        <button
          key={f}
          type="button"
          className="px-3 py-2 rounded-lg text-xs font-medium transition-colors glc-touch-target sm:min-h-0 sm:px-3 sm:py-1.5"
          style={{
            background: filter === f ? ADMIN_REQUEST_QUEUE_CHROME.filterActiveBackground : 'var(--bg-surface)',
            border: `var(--border-width-default) solid ${filter === f ? ADMIN_REQUEST_QUEUE_CHROME.filterActiveBorder : 'var(--border-subtle)'}`,
            color: filter === f ? 'var(--glc-blue)' : 'var(--text-secondary)',
          }}
          onClick={() => onFilterChange(f)}
        >
          {f === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.filterAwaiting : ADMIN_REQUEST_QUEUE_COPY.filterAll}
        </button>
      ))}
    </div>
  );
}
