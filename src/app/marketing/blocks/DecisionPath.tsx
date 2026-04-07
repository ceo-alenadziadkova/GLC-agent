import { Link } from 'react-router';
import { ArrowRight, MapTrifold, Question, Rocket, Stack, Timer } from '@phosphor-icons/react';

const PATHS = [
  {
    to: '/snapshot',
    title: 'I do not know where to start',
    hint: 'Low commitment—a fast check and clear pointers.',
    icon: Question,
  },
  {
    to: '/express-audit',
    title: 'I need a fast outside view',
    hint: 'A bounded format with clear takeaways.',
    icon: Timer,
  },
  {
    to: '/audit',
    title: 'I need deep diagnostics',
    hint: 'Site, UX, processes, integrations, automation, roadmap.',
    icon: Stack,
  },
  {
    to: '/discovery',
    title: 'No site / no structure yet',
    hint: 'A safe start before a fixed spec.',
    icon: MapTrifold,
  },
  {
    to: '/brief',
    title: 'I want to walk through with someone',
    hint: 'We gather inputs together and suggest a step.',
    icon: Rocket,
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
