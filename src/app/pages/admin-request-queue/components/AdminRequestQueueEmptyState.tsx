import { Tray } from '@phosphor-icons/react';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import type { AdminQueueFilter } from '../hooks/useAdminRequestQueue';
import {
  QUEUE_EMPTY_STATE_CONTAINER_CLASS,
  QUEUE_EMPTY_STATE_ICON_CLASS,
  QUEUE_EMPTY_STATE_TEXT_CLASS,
} from '../../queue-tab-config';

export function AdminRequestQueueEmptyState({ filter }: { filter: AdminQueueFilter }) {
  return (
    <div className={QUEUE_EMPTY_STATE_CONTAINER_CLASS}>
      <Tray className={QUEUE_EMPTY_STATE_ICON_CLASS} />
      <p className={QUEUE_EMPTY_STATE_TEXT_CLASS}>
        {filter === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.emptyAwaiting : ADMIN_REQUEST_QUEUE_COPY.emptyAll}
      </p>
    </div>
  );
}
