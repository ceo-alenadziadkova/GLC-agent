import type { KeyboardEvent } from 'react';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import { cn } from '../../../components/ui/utils';
import type { AdminQueueFilter } from '../hooks/useAdminRequestQueue';

type Props = {
  filter: AdminQueueFilter;
  onFilterChange: (f: AdminQueueFilter) => void;
  tabListAriaLabel: string;
  tabPanelId: string;
  onTabListKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  setTabRef: (key: AdminQueueFilter) => (element: HTMLButtonElement | null) => void;
};

export function AdminRequestQueueFilters({
  filter,
  onFilterChange,
  tabListAriaLabel,
  tabPanelId,
  onTabListKeyDown,
  setTabRef,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={tabListAriaLabel} onKeyDown={onTabListKeyDown}>
      {(['pending', 'all'] as const).map(f => (
        <button
          ref={setTabRef(f)}
          key={f}
          type="button"
          role="tab"
          id={`admin-request-queue-tab-${f}`}
          aria-controls={tabPanelId}
          aria-selected={filter === f}
          tabIndex={filter === f ? 0 : -1}
          className={cn(
            'glc-touch-target rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5',
            'border-[length:var(--border-width-default)] border-solid',
            filter === f
              ? 'border-[var(--callout-info-border-strong)] bg-[var(--glc-blue-muted-strong)] text-[var(--glc-blue)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]',
          )}
          onClick={() => onFilterChange(f)}
        >
          {f === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.filterAwaiting : ADMIN_REQUEST_QUEUE_COPY.filterAll}
        </button>
      ))}
    </div>
  );
}
