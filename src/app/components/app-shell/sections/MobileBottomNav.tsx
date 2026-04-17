import { NavLink } from 'react-router';
import { isNavItemActive, type AppShellNavItem } from '../../../lib/app-shell-nav';
import { cn } from '../../ui/utils';

type MobileBottomNavProps = {
  items: AppShellNavItem[];
  pathname: string;
  navAriaLabel: string;
};

export function MobileBottomNav({ items, pathname, navAriaLabel }: MobileBottomNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="ds-mobile-bottom-nav sm:hidden flex flex-shrink-0 items-stretch justify-around bg-[var(--bg-surface)] glc-safe-pad-x"
      aria-label={navAriaLabel}
    >
      {items.map(({ to, icon: Icon, label }) => {
        const active = to ? isNavItemActive(pathname, to) : false;
        if (!to) return null;
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 no-underline min-w-0 py-1 glc-touch-target',
              active ? 'text-[color:var(--glc-blue)]' : 'text-[color:var(--text-tertiary)]',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                'w-full truncate px-0.5 text-center text-[length:var(--text-2xs)] leading-[1.2]',
                active ? 'font-semibold' : 'font-medium',
              )}
            >
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

