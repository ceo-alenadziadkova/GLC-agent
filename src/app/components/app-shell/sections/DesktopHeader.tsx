import type { ReactNode } from 'react';
import { ThemeToggle } from '../../ThemeToggle';

type DesktopHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  isSmUp: boolean;
};

export function DesktopHeader({ title, subtitle, actions, isSmUp }: DesktopHeaderProps) {
  if (!title && !actions) return null;

  return (
    <header
      className="hidden sm:flex flex-shrink-0 items-center justify-between px-7"
      aria-hidden={title ? !isSmUp : undefined}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        minHeight: '56px',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div>
        {title && (
          <h1
            style={{
              color: 'var(--text-primary)',
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              letterSpacing: 'var(--tracking-tight)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p
            style={{
              color: 'var(--text-tertiary)',
              fontSize: 'var(--text-xs)',
              marginTop: 2,
              letterSpacing: '0.01em',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}

