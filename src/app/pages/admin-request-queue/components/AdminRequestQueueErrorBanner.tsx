import { Warning } from '@phosphor-icons/react';

export function AdminRequestQueueErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border-solid border-[length:var(--border-width-default)] border-[var(--ui-danger-border-20)] bg-[var(--ui-danger-muted-bg)] px-4 py-3 text-sm text-[var(--score-1)]"
    >
      <Warning className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
