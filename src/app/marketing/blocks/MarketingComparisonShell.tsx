import type { ReactNode } from 'react';
import { cn } from '../../components/ui/utils';

export type MarketingComparisonShellVariant = 'flat' | 'elevated' | 'feature';

const VARIANT_CLASS: Record<MarketingComparisonShellVariant, string> = {
  flat: 'ds-marketing-surface-comparison-shell',
  elevated: 'ds-marketing-surface-comparison-shell--elevated',
  feature: 'ds-marketing-surface-feature',
};

/**
 * Shared chrome for tier comparison tables and large analytic blocks.
 * `flat` keeps the original border-only treatment; `elevated` adds shadow + gradient
 * + hover lift for signal-heavy sections; `feature` is a brand-muted accent panel.
 */
export function MarketingComparisonShell({
  children,
  className,
  padded = false,
  variant = 'flat',
}: {
  children: ReactNode;
  className?: string;
  /** Inner padding for flush children (e.g. DecisionPath cards). */
  padded?: boolean;
  variant?: MarketingComparisonShellVariant;
}) {
  return (
    <div
      className={cn(
        VARIANT_CLASS[variant],
        'overflow-hidden will-change-transform',
        padded && 'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
