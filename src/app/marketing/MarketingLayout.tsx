import type { ReactNode } from 'react';
import { MarketingBreadcrumbs, type Crumb } from './MarketingBreadcrumbs';
import { MarketingFooter } from './MarketingFooter';
import { MarketingHeader } from './MarketingHeader';

export function MarketingLayout({
  children,
  breadcrumbs,
  showFooter = true,
}: {
  children: ReactNode;
  breadcrumbs?: Crumb[];
  /** When false, only header + main chrome (e.g. Snapshot / Discovery tool pages). */
  showFooter?: boolean;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'var(--mesh-brand)', opacity: 0.42, zIndex: 0 }}
        aria-hidden
      />
      <MarketingHeader />
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
          {breadcrumbs && breadcrumbs.length > 0 && <MarketingBreadcrumbs items={breadcrumbs} />}
          {children}
        </div>
        {showFooter ? <MarketingFooter /> : null}
      </div>
    </div>
  );
}
