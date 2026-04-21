import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { cn } from '../../../components/ui/utils';
import type { MarketingHomeViewModel } from '../types/home-content.types';

type HomeGuidedPathSelectorProps = {
  data: MarketingHomeViewModel['chooseEntry'];
};

export function HomeGuidedPathSelector({ data }: HomeGuidedPathSelectorProps) {
  if (data.selectorOptions.length === 0 || data.selectorPaths.length === 0) return null;

  return (
    <div className="mt-8 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:mt-10 sm:p-5">
      <h3 className="font-display text-lg font-semibold tracking-tight ds-text-primary sm:text-xl">{data.selectorTitle}</h3>
      <p className="mt-1 max-w-[60ch] text-sm leading-relaxed ds-text-secondary">{data.selectorDescription}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {data.selectorOptions.map((option) => {
          const path = data.selectorPaths.find((item) => item.id === option.recommendedPathId);
          if (!path) return null;
          return (
            <Link
              key={option.id}
              to={path.to}
              className={cn(
                'group rounded-xl border px-3 py-2.5 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]',
                'border-[var(--border-subtle)] bg-[var(--bg-muted)] hover:border-[var(--glc-blue)]',
              )}
            >
              <span className="block text-sm font-semibold ds-text-primary">{option.label}</span>
              {path.subtitle ? <span className="mt-1 block text-xs ds-text-secondary">{path.subtitle}</span> : null}
              <span className="mt-1 block text-xs text-[var(--text-secondary)]">{path.nextStepLabel}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--glc-blue)]">
                {path.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
      {data.selectorComparisonRows.length > 0 ? (
        <div className="ds-home-guided-matrix mt-4" aria-label="Route comparison matrix">
          <div className="ds-home-guided-matrix-header">
            <span>Compare routes</span>
            <span>Snapshot</span>
            <span>Context</span>
            <span>Strategy</span>
          </div>
          {data.selectorComparisonRows.map((row) => (
            <div key={row.label} className="ds-home-guided-matrix-row">
              <span className="ds-home-guided-matrix-label">{row.label}</span>
              <span>{row.values.snapshot}</span>
              <span>{row.values.pro}</span>
              <span>{row.values.complete}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-[var(--text-secondary)]">
        {data.selectorRecoveryLabel}{' '}
        <Link
          to={data.selectorRecoveryCtaTo}
          className={cn(
            'font-semibold text-[var(--glc-blue)] underline-offset-4 hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]',
          )}
        >
          {data.selectorRecoveryCtaLabel}
        </Link>
      </p>
    </div>
  );
}
