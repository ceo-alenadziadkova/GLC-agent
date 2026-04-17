import { Spinner } from '@phosphor-icons/react';

export function AdminRequestQueueLoading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
    </div>
  );
}
