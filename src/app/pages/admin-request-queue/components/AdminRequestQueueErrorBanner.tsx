import { Warning } from '@phosphor-icons/react';
import { ADMIN_REQUEST_QUEUE_CHROME } from '../../../config/admin-request-queue-copy.en';

export function AdminRequestQueueErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        backgroundColor: ADMIN_REQUEST_QUEUE_CHROME.errorPanelBackground,
        border: `1px solid ${ADMIN_REQUEST_QUEUE_CHROME.errorPanelBorder}`,
        color: ADMIN_REQUEST_QUEUE_CHROME.errorText,
      }}
    >
      <Warning className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
