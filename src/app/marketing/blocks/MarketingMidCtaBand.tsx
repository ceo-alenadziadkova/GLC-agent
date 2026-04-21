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
      className={cn(
        'glc-info-glass-surface -mx-4 border-y border-[var(--border-subtle)] px-4 py-12 sm:-mx-6 sm:px-8 sm:py-14',
        className,
      )}
      aria-label={landmarkLabel ?? title}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl ds-text-primary" >
            {title}
          </h2>
          <p className="ds-marketing-mid-cta-body ds-text-secondary">
            {body}
          </p>
          {recoveryLabel && recoveryCtaLabel && recoveryCtaTo ? (
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-tertiary)] sm:text-sm">
              {recoveryLabel}{' '}
              <Link to={recoveryCtaTo} className="font-semibold text-[var(--glc-blue)] underline underline-offset-4">
                {recoveryCtaLabel}
              </Link>
            </p>
          ) : null}
        </div>
        <Button
          asChild
          variant="default"
          className={cn(
            'ds-cta-primary group inline-flex shrink-0 items-center justify-center gap-2 text-sm font-semibold transition-[opacity,transform] duration-200',
            FOCUS,
          )}
        >
          <Link to={ctaTo} className="no-underline">
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </aside>
  );
}
