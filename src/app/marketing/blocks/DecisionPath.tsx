import { Link } from 'react-router';
import { ArrowRight, MapTrifold, Question, Rocket, Stack, Timer } from '@phosphor-icons/react';

const PATHS = [
  {
    to: '/brief',
    title: 'I need the right path fast',
    hint: 'Answer a short brief and get a recommended route for your case.',
    icon: Rocket,
  },
  {
    to: '/snapshot',
    title: 'I want a quick automated read first',
    hint: 'Low-commitment scan of public signals before paid coverage.',
    icon: Question,
  },
  {
    to: '/starter',
    title: 'I need one critical domain now',
    hint: 'Starter: focused depth with actionable first moves.',
    icon: Timer,
  },
  {
    to: '/pro',
    title: 'I need multi-domain confidence',
    hint: 'Pro: 2-3 domains or Complete: full six-domain synthesis.',
    icon: Stack,
  },
  {
    to: '/discovery',
    title: 'No site / no structure yet',
    hint: 'A safe start before a fixed spec.',
    icon: MapTrifold,
  },
] as const;

export function DecisionPath() {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
    >
      {PATHS.map(({ to, title, hint, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex gap-4 border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--bg-muted)] sm:gap-5 sm:px-6 sm:py-5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11"
            style={{ backgroundColor: 'var(--glc-blue-muted)' }}
          >
            <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" style={{ color: 'var(--glc-blue-deeper)' }} weight="duotone" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {hint}
            </p>
          </div>
          <ArrowRight
            className="mt-1 h-5 w-5 shrink-0 self-start opacity-35 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 sm:mt-1.5"
            style={{ color: 'var(--glc-blue)' }}
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
