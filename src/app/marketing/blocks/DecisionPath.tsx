import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { ArrowRight, MapTrifold, Question, Stack } from '@phosphor-icons/react';
import { cn } from '../../components/ui/utils';
import workspacePackaging from '../../data/marketing-workspace-packaging.en.json';

const PATH_ICONS = [Question, Stack, MapTrifold] as const;
const PATH_ICON_ACCENTS = [
  { icon: 'var(--glc-blue-deeper)', bg: 'var(--glc-blue-muted)' },
  { icon: 'var(--glc-green-dark)', bg: 'var(--glc-green-muted)' },
  { icon: 'var(--text-secondary)', bg: 'color-mix(in oklab, var(--bg-muted) 90%, var(--bg-surface))' },
] as const;

export function DecisionPath({
  flush = false,
  variant = 'stack',
}: {
  flush?: boolean;
  /** `cards` — premium grid for marketing home; `stack` — bordered list (default). */
  variant?: 'stack' | 'cards';
}) {
  const paths = workspacePackaging.decision_paths;

  if (variant === 'cards') {
    return (
      <div
        className={cn(
          'grid gap-4 sm:gap-5 md:grid-cols-3',
          !flush && 'rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5',
        )}
      >
        {paths.map(({ to, title, subtitle }, index) => {
          const Icon = PATH_ICONS[index] ?? Question;
          const accent = PATH_ICON_ACCENTS[index] ?? PATH_ICON_ACCENTS[0];
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'group flex h-full min-h-[length:var(--decision-path-card-min-height)] flex-col rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-surface)_92%,var(--bg-muted))] p-6 shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color,background-color] duration-200 sm:min-h-[length:var(--decision-path-card-min-height-sm)] sm:p-7',
                'hover:-translate-y-1 hover:border-[var(--glc-blue)]',
              )}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--decision-path-icon-bg)] sm:h-12 sm:w-12"
                style={
                  {
                    ['--decision-path-icon-bg']: accent.bg,
                    ['--decision-path-icon-fg']: accent.icon,
                  } as CSSProperties
                }
              >
                <Icon className="h-5 w-5 text-[var(--decision-path-icon-fg)] sm:h-6 sm:w-6" weight="duotone" />
              </div>
              <h3
                className="mt-4 font-display text-base font-bold tracking-tight sm:text-lg ds-text-primary"
                
              >
                {title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed ds-text-secondary" >
                {subtitle}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold ds-text-brand" >
                <span>Explore</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden bg-[var(--bg-surface)]',
        !flush && 'rounded-xl border border-[var(--border-subtle)]',
      )}
    >
      {paths.map(({ to, title, subtitle }, index) => {
        const Icon = PATH_ICONS[index] ?? Question;
        const accent = PATH_ICON_ACCENTS[index] ?? PATH_ICON_ACCENTS[0];
        return (
          <Link
            key={to}
            to={to}
            className="group flex gap-4 border-b border-[var(--border-subtle)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--bg-muted)] sm:gap-5 sm:px-8 sm:py-6"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--decision-path-icon-bg)] sm:h-11 sm:w-11"
              style={
                {
                  ['--decision-path-icon-bg']: accent.bg,
                  ['--decision-path-icon-fg']: accent.icon,
                } as CSSProperties
              }
            >
              <Icon
                className="h-5 w-5 text-[var(--decision-path-icon-fg)] sm:h-[length:var(--decision-path-stack-icon-size)] sm:w-[length:var(--decision-path-stack-icon-size)]"
                weight="duotone"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-base font-bold tracking-tight ds-text-primary" >
                {title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed ds-text-secondary" >
                {subtitle}
              </p>
            </div>
            <ArrowRight
              className="mt-1 h-5 w-5 shrink-0 self-start opacity-35 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 sm:mt-1.5 ds-text-brand"
              
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
