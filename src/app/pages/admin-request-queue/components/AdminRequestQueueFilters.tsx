import type { KeyboardEvent } from 'react';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import { cn } from '../../../components/ui/utils';
import {
  ADMIN_REQUEST_QUEUE_FILTER_ORDER,
  type AdminQueueFilter,
} from '../hooks/useAdminRequestQueue';
import {
  QUEUE_TAB_BUTTON_BASE_CLASS,
  REQUEST_QUEUE_TAB_BUTTON_ACTIVE_CLASS,
  REQUEST_QUEUE_TAB_BUTTON_BASE_CLASS,
  REQUEST_QUEUE_TAB_BUTTON_INACTIVE_CLASS,
} from '../../queue-tab-config';

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
      {ADMIN_REQUEST_QUEUE_FILTER_ORDER.map(f => (
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
            QUEUE_TAB_BUTTON_BASE_CLASS,
            REQUEST_QUEUE_TAB_BUTTON_BASE_CLASS,
            filter === f
              ? REQUEST_QUEUE_TAB_BUTTON_ACTIVE_CLASS
              : REQUEST_QUEUE_TAB_BUTTON_INACTIVE_CLASS,
          )}
          onClick={() => onFilterChange(f)}
        >
          {f === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.filterAwaiting : ADMIN_REQUEST_QUEUE_COPY.filterAll}
        </button>
      ))}
    </div>
  );
}
