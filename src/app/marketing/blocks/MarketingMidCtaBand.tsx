import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { cn } from '../../components/ui/utils';
import { Button } from '../../components/ui/button';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-muted)]';

export function MarketingMidCtaBand({
  title,
  body,
  ctaLabel,
  ctaTo,
  recoveryLabel,
  recoveryCtaLabel,
  recoveryCtaTo,
  className,
  /** Overrides `aria-label` when the visible title should differ from the landmark (e.g. page TOC). */
  landmarkLabel,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
  recoveryLabel?: string;
  recoveryCtaLabel?: string;
  recoveryCtaTo?: string;
  className?: string;
  landmarkLabel?: string;
}) {
  return (
    <aside
      className={cn('ds-marketing-glass-mid-cta', className)}
      aria-label={landmarkLabel ?? title}
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {title}
          </h2>
          <p className="ds-marketing-text-muted mt-4 max-w-2xl text-base leading-relaxed">
            {body}
          </p>
          {recoveryLabel && recoveryCtaLabel && recoveryCtaTo ? (
            <p className="mt-4 text-xs leading-relaxed text-white/50 sm:text-sm">
              {recoveryLabel}{' '}
              <Link
                to={recoveryCtaTo}
                className={cn(
                  'font-medium text-[var(--text-primary)] underline underline-offset-4 transition-colors hover:text-[var(--text-primary)]/80',
                  FOCUS,
                )}
              >
                {recoveryCtaLabel}
              </Link>
            </p>
          ) : null}
        </div>
        <Button
          asChild
          variant="default"
          className="group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border border-white/20 bg-white/10 px-6 py-6 text-sm font-medium text-[var(--text-primary)] backdrop-blur-md transition-all duration-300 hover:bg-white/20"
        >
          <Link to={ctaTo} className={cn('no-underline', FOCUS)}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
