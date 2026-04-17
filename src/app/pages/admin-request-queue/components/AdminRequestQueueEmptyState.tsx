import { Tray } from '@phosphor-icons/react';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import type { AdminQueueFilter } from '../hooks/useAdminRequestQueue';

export function AdminRequestQueueEmptyState({ filter }: { filter: AdminQueueFilter }) {
  return (
    <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
      <Tray className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
      <p className="text-sm font-medium">
        {filter === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.emptyAwaiting : ADMIN_REQUEST_QUEUE_COPY.emptyAll}
      </p>
    </div>
  );
}
