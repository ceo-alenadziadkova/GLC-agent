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
          !flush && 'rounded-[var(--radius-2xl)] border p-4 sm:p-5',
        )}
        style={
          flush
            ? { backgroundColor: 'transparent' }
            : { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }
        }
      >
        {paths.map(({ to, title, subtitle }, index) => {
          const Icon = PATH_ICONS[index] ?? Question;
          const accent = PATH_ICON_ACCENTS[index] ?? PATH_ICON_ACCENTS[0];
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'group flex h-full min-h-[180px] flex-col rounded-[var(--radius-2xl)] border p-6 transition-[transform,box-shadow,border-color,background-color] duration-200 sm:min-h-[200px] sm:p-7',
                'hover:-translate-y-1 hover:border-[var(--glc-blue)]',
              )}
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'color-mix(in oklab, var(--bg-surface) 92%, var(--bg-muted))',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12"
                style={{ backgroundColor: accent.bg }}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: accent.icon }} weight="duotone" />
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
      className={flush ? 'overflow-hidden' : 'overflow-hidden rounded-xl border'}
      style={
        flush
          ? { backgroundColor: 'var(--bg-surface)' }
          : { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }
      }
    >
      {paths.map(({ to, title, subtitle }, index) => {
        const Icon = PATH_ICONS[index] ?? Question;
        const accent = PATH_ICON_ACCENTS[index] ?? PATH_ICON_ACCENTS[0];
        return (
          <Link
            key={to}
            to={to}
            className="group flex gap-4 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--bg-muted)] sm:gap-5 sm:px-8 sm:py-6"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11"
              style={{ backgroundColor: accent.bg }}
            >
              <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" style={{ color: accent.icon }} weight="duotone" />
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
