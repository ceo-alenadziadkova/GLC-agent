import { Warning } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';
import {
  QUEUE_ERROR_BANNER_CLASS,
  QUEUE_ERROR_BANNER_TEXT_CLASS,
} from '../../queue-tab-config';

export function AdminRequestQueueErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className={`${QUEUE_ERROR_BANNER_CLASS} flex-col items-start sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="flex items-center gap-3">
        <Warning className="h-4 w-4 flex-shrink-0" />
        <span className={QUEUE_ERROR_BANNER_TEXT_CLASS}>{message}</span>
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" className="glc-touch-target sm:min-h-0" onClick={onRetry}>
          {ADMIN_REQUEST_QUEUE_COPY.retryLoad}
        </Button>
      )}
    </div>
  );
}
