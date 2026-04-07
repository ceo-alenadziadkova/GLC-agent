import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { List, X } from '@phosphor-icons/react';
import { GlcLogo } from '../components/GlcLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LOGIN_PATH, MARKETING_LINKS } from './marketing-nav';
import { cn } from '../components/ui/utils';

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'color-mix(in oklab, var(--bg-canvas) 88%, transparent)',
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <GlcLogo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden lg:flex lg:flex-1 lg:justify-center" aria-label="Primary navigation">
          <ul className="flex flex-wrap items-center justify-center gap-1">
            {MARKETING_LINKS.filter(l => l.to !== '/').map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--bg-muted)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            to={LOGIN_PATH}
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex"
            style={{
              color: 'var(--glc-blue)',
              border: '1px solid color-mix(in oklab, var(--glc-blue) 35%, var(--border-default))',
            }}
          >
            Sign in
          </Link>
          <button
            type="button"
            className="inline-flex rounded-lg p-2 lg:hidden"
            style={{
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="border-t lg:hidden"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
            {MARKETING_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-3 py-2.5 text-sm font-medium',
                      isActive ? 'bg-[var(--bg-muted)]' : '',
                    )
                  }
                  style={{ color: 'var(--text-primary)' }}
                >
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to={LOGIN_PATH}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold"
                style={{ color: 'var(--glc-blue)' }}
              >
                Client sign-in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
