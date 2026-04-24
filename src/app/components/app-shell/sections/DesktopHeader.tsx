import type { ReactNode } from 'react';
import { ThemeToggle } from '../../ThemeToggle';

type DesktopHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function DesktopHeader({ title, subtitle, actions }: DesktopHeaderProps) {
  if (!title && !actions) return null;

  return (
    <header className="ds-desktop-header hidden sm:flex flex-shrink-0 items-center justify-between">
      <div>
        {title && <h1 className="ds-desktop-header-title">{title}</h1>}
        {subtitle && <p className="ds-desktop-header-subtitle">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {actions}
      </div>
    </header>
  );
}
