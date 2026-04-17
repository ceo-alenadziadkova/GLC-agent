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
      className="border-b px-6 py-5 sm:px-8"
      style={{
        borderColor: 'var(--border-subtle)',
        background: isHome
          ? 'var(--bg-muted)'
          : 'linear-gradient(135deg, color-mix(in oklab, var(--bg-muted) 62%, transparent) 0%, color-mix(in oklab, var(--glc-blue-muted) 46%, transparent) 100%)',
      }}
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
          className="flex flex-wrap items-center gap-2 font-semibold"
          style={{ color: s.primary ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {s.label}
          {s.primary && (
            <span
              className="rounded-full px-2 py-0.5 text-[length:var(--text-2xs)] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: 'var(--glc-orange-xlight)',
                color: 'var(--glc-orange-dark)',
              }}
            >
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
      <div
        className="glc-card overflow-hidden"
        style={{
          borderRadius: 'var(--radius-2xl)',
          boxShadow: isHome ? 'none' : 'var(--shadow-card)',
          border: isHome ? '1px solid var(--border-subtle)' : undefined,
        }}
      >
        {header}
        <ul className="grid gap-3 border border-[var(--border-subtle)] p-4 sm:grid-cols-2 sm:p-5">
          {steps.map(s => (
            <li key={s.to}>
              <Link
                to={s.to}
                className={cn(
                  stepLinkClass,
                  'h-full rounded-[var(--radius-xl)] border p-4',
                )}
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: s.primary
                    ? 'color-mix(in oklab, var(--glc-blue-muted) 40%, transparent)'
                    : 'var(--bg-surface)',
                  textDecoration: 'none',
                }}
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
      <div
        className="glc-card overflow-hidden"
        style={{
          borderRadius: 'var(--radius-2xl)',
          boxShadow: isHome ? 'none' : 'var(--shadow-card)',
          border: isHome ? '1px solid var(--border-subtle)' : undefined,
        }}
      >
        {header}
        <div className="overflow-x-auto">
          <ul className="flex gap-3 px-4 py-4 sm:px-6" style={{ width: 'max-content' }}>
            {steps.map(s => (
              <li key={s.to} className="w-[min(18rem,78vw)] shrink-0">
                <Link
                  to={s.to}
                  className={cn(stepLinkClass, 'rounded-[var(--radius-xl)] border p-4')}
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: s.primary
                      ? 'color-mix(in oklab, var(--glc-blue-muted) 40%, transparent)'
                      : 'var(--bg-surface)',
                    textDecoration: 'none',
                  }}
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
    <div
      className="glc-card overflow-hidden"
      style={{
        borderRadius: 'var(--radius-2xl)',
        boxShadow: isHome ? 'none' : 'var(--shadow-card)',
        border: isHome ? '1px solid var(--border-subtle)' : undefined,
      }}
    >
      {header}
      <ul className="divide-y divide-[var(--border-subtle)]">
        {steps.map(s => (
          <li key={s.to}>
            <Link
              to={s.to}
              className={cn(stepLinkClass, 'px-6 py-4 sm:px-8 sm:py-5')}
              style={{
                backgroundColor: s.primary
                  ? isHome
                    ? 'color-mix(in oklab, var(--glc-blue-muted) 35%, transparent)'
                    : 'color-mix(in oklab, var(--glc-blue-muted) 50%, transparent)'
                  : 'transparent',
                border: s.primary ? '1px solid color-mix(in oklab, var(--glc-blue) 38%, var(--border-subtle))' : '1px solid transparent',
                textDecoration: 'none',
              }}
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
