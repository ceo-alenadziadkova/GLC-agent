import { Warning } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { ADMIN_REQUEST_QUEUE_COPY } from '../../../config/admin-request-queue-copy.en';

export function AdminRequestQueueErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border-solid border-[length:var(--border-width-default)] border-[var(--ui-danger-border-20)] bg-[var(--ui-danger-muted-bg)] px-4 py-3 text-sm text-[var(--score-1)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <Warning className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button type="button" size="sm" variant="outline" className="glc-touch-target sm:min-h-0" onClick={onRetry}>
          {ADMIN_REQUEST_QUEUE_COPY.retryLoad}
        </Button>
      )}
    </div>
  );
}
