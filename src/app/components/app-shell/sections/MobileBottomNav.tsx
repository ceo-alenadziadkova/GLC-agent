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
      className="sm:hidden flex flex-shrink-0 border-t glc-safe-pad-x items-stretch justify-around"
      style={{
        backgroundColor: 'var(--bg-surface)',
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
            style={{
              color: active ? 'var(--glc-blue)' : 'var(--text-tertiary)',
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" style={{ color: 'inherit' }} />
            <span
              className="truncate w-full text-center px-0.5"
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

