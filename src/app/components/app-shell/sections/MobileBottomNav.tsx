import { NavLink } from 'react-router';
import { isNavItemActive, type AppShellNavItem } from '../../../lib/app-shell-nav';
import { APP_SHELL_UI_POLICY } from '../config/app-shell-ui-policy';

type MobileBottomNavProps = {
  items: AppShellNavItem[];
  pathname: string;
  navAriaLabel: string;
};

export function MobileBottomNav({ items, pathname, navAriaLabel }: MobileBottomNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="sm:hidden flex flex-shrink-0 items-stretch justify-around border-t bg-[var(--bg-surface)] glc-safe-pad-x"
      style={{
        borderColor: 'var(--border-subtle)',
        minHeight: 'var(--glc-mobile-nav-height)',
        paddingBottom: 'max(var(--space-2), env(safe-area-inset-bottom, 0px))',
        boxShadow: APP_SHELL_UI_POLICY.mobile.bottomNavShadow,
      }}
      aria-label={navAriaLabel}
    >
      {items.map(({ to, icon: Icon, label }) => {
        const active = to ? isNavItemActive(pathname, to) : false;
        if (!to) return null;
        return (
          <NavLink
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 no-underline min-w-0 py-1 glc-touch-target"
            style={{ color: active ? 'var(--glc-blue)' : 'var(--text-tertiary)' }}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span
              className="w-full truncate px-0.5 text-center"
              style={{
                fontSize: APP_SHELL_UI_POLICY.nav.itemLabelSizePx,
                fontWeight: active ? 600 : 500,
                lineHeight: 1.2,
              }}
            >
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

