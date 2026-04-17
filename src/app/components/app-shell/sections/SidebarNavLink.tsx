import { NavLink } from 'react-router';
import { isNavItemActive, type AppShellNavItem } from '../../../lib/app-shell-nav';
import { cn } from '../../ui/utils';
import { APP_SHELL_UI_POLICY } from '../config/app-shell-ui-policy';

type SidebarNavLinkProps = {
  item: AppShellNavItem;
  pathname: string;
  itemKey: string;
  onClick: () => void;
};

export function SidebarNavLink({ item, pathname, itemKey, onClick }: SidebarNavLinkProps) {
  const { to, icon: Icon, label, badge } = item;
  if (!to) {
    return (
      <div
        key={itemKey}
        className="relative flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-[length:var(--text-sm)] text-[color:var(--overlay-white-20)]"
      >
        <Icon className="relative h-4 w-4 shrink-0 text-[color:var(--overlay-white-15)]" />
        <span className="relative flex-1 truncate">{label}</span>
      </div>
    );
  }

  const active = isNavItemActive(pathname, to);
  return (
    <NavLink
      key={itemKey}
      to={to}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[length:var(--text-sm)] no-underline transition-colors duration-200',
        active
          ? 'font-medium text-[color:var(--primary-foreground)]'
          : 'font-normal text-[color:var(--overlay-white-46)]',
      )}
      onClick={onClick}
    >
      {active && (
        <span className="ds-sidebar-nav-active-backdrop absolute inset-0 rounded-lg transition-[opacity,transform] duration-200 ease-out" />
      )}
      {active && (
        <span className="ds-sidebar-nav-active-rail absolute left-0 top-1/2 w-0.5 -translate-y-1/2 rounded-full" />
      )}
      <Icon
        className={cn(
          'relative h-4 w-4 flex-shrink-0',
          active ? 'text-[color:var(--glc-blue)]' : 'text-[color:var(--overlay-white-38)]',
        )}
      />
      <span className="relative flex-1 truncate">{label}</span>
      {badge && (
        <span
          className={cn(
            'relative rounded-full px-1.5 py-0.5 text-[length:var(--text-2xs)] font-semibold tabular-nums',
            active
              ? 'border border-[color:var(--callout-info-border)] bg-[color:var(--callout-info-border)] text-[color:var(--glc-blue)]'
              : 'border border-transparent bg-[color:var(--sidebar-border)] text-[color:var(--overlay-white-38)]',
          )}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}

