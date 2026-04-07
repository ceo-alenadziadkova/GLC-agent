import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

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
}: {
  title?: string;
  subtitle?: string;
  steps: NextStepItem[];
  footnote?: ReactNode;
}) {
  return (
    <div
      className="glc-card overflow-hidden"
      style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="border-b px-6 py-5 sm:px-8"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'color-mix(in oklab, var(--bg-muted) 40%, transparent)' }}
      >
        <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {steps.map(s => (
          <li key={s.to}>
            <Link
              to={s.to}
              className="group flex items-start gap-4 px-6 py-4 transition-colors sm:px-8 sm:py-5"
              style={{
                backgroundColor: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--bg-muted)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {s.label}
                  {s.primary && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: 'var(--glc-blue-muted)',
                        color: 'var(--glc-blue-deeper)',
                      }}
                    >
                      Recommended
                    </span>
                  )}
                </p>
                {s.hint && (
                  <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {s.hint}
                  </p>
                )}
              </div>
              <ArrowRight
                className="mt-0.5 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ color: 'var(--glc-blue)' }}
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
      {footnote && (
        <div className="px-6 py-4 sm:px-8" style={{ backgroundColor: 'var(--bg-inset)' }}>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            {footnote}
          </p>
        </div>
      )}
    </div>
  );
}
