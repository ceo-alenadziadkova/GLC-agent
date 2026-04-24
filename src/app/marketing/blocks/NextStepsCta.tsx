import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '../../components/ui/utils';

const STEP_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]';

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
      className="border-b border-white/10 bg-white/[0.02] px-6 py-6 sm:px-8"
      data-home={isHome ? 'true' : 'false'}
    >
      <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
        {title}
      </h2>
      {subtitle && (
        <p className="ds-marketing-text-muted mt-2 max-w-2xl text-sm leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );

  const stepLinkClass =
    'group flex items-start gap-3 rounded-[var(--radius-lg)] transition-all duration-200 hover:translate-x-1 hover:bg-white/[0.05] hover:border-white/20';

  const stepInner = (s: NextStepItem) => (
    <>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'flex flex-wrap items-center gap-2 font-semibold',
            s.primary ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]/80',
          )}
        >
          {s.label}
          {s.primary && (
            <span className="rounded-full border border-[var(--glc-blue)]/30 bg-[var(--glc-blue)]/10 px-2 py-0.5 text-[length:var(--text-2xs)] font-bold uppercase tracking-wide text-[var(--glc-blue)]">
              Recommended
            </span>
          )}
        </p>
        {s.hint && (
          <p className="ds-marketing-text-muted mt-1.5 text-sm leading-relaxed">
            {s.hint}
          </p>
        )}
      </div>
      <ArrowRight
        className="mt-0.5 h-5 w-5 shrink-0 text-[var(--glc-blue)] opacity-45 transition-[transform,opacity] duration-200 group-hover:translate-x-1 group-hover:opacity-100"
        aria-hidden
      />
    </>
  );

  if (layout === 'compact-grid') {
    return (
      <div className="ds-marketing-next-steps-card" data-home={isHome ? 'true' : 'false'}>
        {header}
        <ul className="grid gap-4 p-6 sm:grid-cols-2">
          {steps.map(s => (
            <li key={s.to}>
              <Link
                to={s.to}
                className={cn(
                  stepLinkClass,
                  STEP_FOCUS,
                  'ds-marketing-glass-tile h-full',
                )}
                data-primary={s.primary ? 'true' : 'false'}
              >
                {stepInner(s)}
              </Link>
            </li>
          ))}
        </ul>
        {footnote ? (
          <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:px-8">
            <p className="ds-marketing-text-muted text-xs leading-relaxed">
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
                    STEP_FOCUS,
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
          <div className="px-6 py-4 sm:px-8 ds-bg-inset">
            <p className="text-xs leading-relaxed ds-text-tertiary">
              {footnote}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ds-marketing-next-steps-card" data-home={isHome ? 'true' : 'false'}>
      {header}
      <ul className="divide-y divide-white/10">
        {steps.map(s => (
          <li key={s.to}>
            <Link
              to={s.to}
              className={cn(stepLinkClass, STEP_FOCUS, 'px-6 py-5 sm:px-8 sm:py-6')}
              data-primary={s.primary ? 'true' : 'false'}
              data-home={isHome ? 'true' : 'false'}
            >
              {stepInner(s)}
            </Link>
          </li>
        ))}
      </ul>
      {footnote && (
        <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:px-8">
          <p className="ds-marketing-text-muted text-xs leading-relaxed">
            {footnote}
          </p>
        </div>
      )}
    </div>
  );
}
