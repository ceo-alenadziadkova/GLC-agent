import type { ReactNode } from 'react';
import { cn } from '../../components/ui/utils';

/**
 * Shared chrome for tier comparison tables and large analytic blocks.
 */
export function MarketingComparisonShell({
  children,
  className,
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  /** Inner padding for flush children (e.g. DecisionPath home rail / cards). */
  padded?: boolean;
}) {
  return (
    <div
      className={cn('ds-marketing-glass-panel will-change-transform', padded && 'ds-marketing-glass-panel--padded', className)}
    >
      {children}
    </div>
  );
}
