import type { ReactNode } from 'react';

/** Canonical max-width + vertical rhythm wrapper for Delivery Board body under unified Plan. */
export function BoardShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-8 px-4 pb-10 md:px-6">{children}</div>;
}
