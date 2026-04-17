import { Tray } from '@phosphor-icons/react';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import type { AdminQueueFilter } from '../hooks/useAdminRequestQueue';

export function AdminRequestQueueEmptyState({ filter }: { filter: AdminQueueFilter }) {
  return (
    <div className="py-16 text-center text-[var(--text-tertiary)]">
      <Tray className="mx-auto mb-3 h-10 w-10 text-[var(--text-quaternary)]" />
      <p className="text-sm font-medium">
        {filter === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.emptyAwaiting : ADMIN_REQUEST_QUEUE_COPY.emptyAll}
      </p>
    </div>
  );
}
