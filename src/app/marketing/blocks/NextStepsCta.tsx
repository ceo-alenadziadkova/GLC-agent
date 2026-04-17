import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '../../components/ui/utils';

export type NextStepItem = {
  to: string;
  label: string;
  hint?: string;
  primary?: boolean;
};

export function NextStepsCta({
  title = 'What to do next',
  subtitle,
  steps,
  footnote,
  variant = 'default',
  /** `compact-grid` — denser 2-col tiles; `rail` — horizontal scroll strip. */
  layout = 'list',
}: {
  title?: string;
  subtitle?: string;
  steps: NextStepItem[];
  footnote?: ReactNode;
  /** `home` — flat marketing shell (no card shadow, neutral header). */
  variant?: 'default' | 'home';
  layout?: 'list' | 'compact-grid' | 'rail';
}) {
  const isHome = variant === 'home';

  const header = (
    <div
      className="ds-next-steps-header border-b px-6 py-5 sm:px-8"
      data-home={isHome ? 'true' : 'false'}
    >
      <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl ds-text-primary" >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed ds-text-tertiary" >
          {subtitle}
        </p>
      )}
    </div>
  );

  const stepLinkClass =
    'group flex items-start gap-3 rounded-[var(--radius-lg)] transition-[background-color,transform,border-color] duration-200 hover:translate-x-1 hover:bg-[var(--bg-muted)]';

  const stepInner = (s: NextStepItem) => (
    <>
      <div className="min-w-0 flex-1">
        <p
          className={`flex flex-wrap items-center gap-2 font-semibold ${s.primary ? 'ds-next-step-title-primary' : 'ds-next-step-title-secondary'}`}
        >
          {s.label}
          {s.primary && (
            <span className="rounded-full px-2 py-0.5 text-[length:var(--text-2xs)] font-bold uppercase tracking-wide ds-next-step-recommended-badge">
              Recommended
            </span>
          )}
        </p>
        {s.hint && (
          <p className="mt-0.5 text-sm leading-relaxed ds-text-secondary" >
            {s.hint}
          </p>
        )}
      </div>
      <ArrowRight
        className="mt-0.5 h-5 w-5 shrink-0 opacity-45 transition-[transform,opacity] duration-200 group-hover:translate-x-1 group-hover:opacity-100 ds-text-brand"
        
        aria-hidden
      />
    </>
  );

  if (layout === 'compact-grid') {
    return (
      <div className="ds-next-steps-card glc-card overflow-hidden" data-home={isHome ? 'true' : 'false'}>
        {header}
        <ul className="grid gap-3 border border-[var(--border-subtle)] p-4 sm:grid-cols-2 sm:p-5">
          {steps.map(s => (
            <li key={s.to}>
              <Link
                to={s.to}
                className={cn(
                  stepLinkClass,
                  'ds-next-steps-tile-link h-full rounded-[var(--radius-xl)] border p-4',
                )}
                data-primary={s.primary ? 'true' : 'false'}
              >
                {stepInner(s)}
              </Link>
            </li>
          ))}
        </ul>
        {footnote ? (
          <div className="px-6 py-4 sm:px-8 ds-bg-inset" >
            <p className="text-xs leading-relaxed ds-text-tertiary" >
              {footnote}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  if (layout === 'rail') {
    return (
      <div className="ds-next-steps-card glc-card overflow-hidden" data-home={isHome ? 'true' : 'false'}>
        {header}
        <div className="overflow-x-auto">
          <ul className="flex w-max gap-3 px-4 py-4 sm:px-6">
            {steps.map(s => (
              <li key={s.to} className="shrink-0 ds-next-steps-rail-card">
                <Link
                  to={s.to}
                  className={cn(
                    stepLinkClass,
                    'ds-next-steps-tile-link rounded-[var(--radius-xl)] border p-4',
                  )}
                  data-primary={s.primary ? 'true' : 'false'}
                >
                  {stepInner(s)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {footnote ? (
          <div className="px-6 py-4 sm:px-8 ds-bg-inset" >
            <p className="text-xs leading-relaxed ds-text-tertiary" >
              {footnote}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ds-next-steps-card glc-card overflow-hidden" data-home={isHome ? 'true' : 'false'}>
      {header}
      <ul className="divide-y divide-[var(--border-subtle)]">
        {steps.map(s => (
          <li key={s.to}>
            <Link
              to={s.to}
              className={cn(stepLinkClass, 'ds-next-steps-row-link px-6 py-4 sm:px-8 sm:py-5')}
              data-primary={s.primary ? 'true' : 'false'}
              data-home={isHome ? 'true' : 'false'}
            >
              {stepInner(s)}
            </Link>
          </li>
        ))}
      </ul>
      {footnote && (
        <div className="px-6 py-4 sm:px-8 ds-bg-inset" >
          <p className="text-xs leading-relaxed ds-text-tertiary" >
            {footnote}
          </p>
        </div>
      )}
    </div>
  );
}
