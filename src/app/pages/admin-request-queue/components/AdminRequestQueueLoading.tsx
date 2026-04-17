import { Spinner } from '@phosphor-icons/react';

export function AdminRequestQueueLoading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="h-6 w-6 animate-spin text-[var(--glc-blue)]" />
    </div>
  );
}
