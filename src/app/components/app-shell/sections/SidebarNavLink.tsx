import { NavLink } from 'react-router';
import { isNavItemActive, type AppShellNavItem } from '../../../lib/app-shell-nav';
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
      className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[length:var(--text-sm)] no-underline transition-all"
      style={{
        color: active ? 'var(--primary-foreground)' : APP_SHELL_UI_POLICY.colors.white046,
        fontWeight: active ? 500 : 400,
        transition: 'color var(--ease-fast)',
      }}
      onClick={onClick}
    >
      {active && (
        <span
          className="absolute inset-0 rounded-lg transition-[opacity,transform] duration-200 ease-out"
          style={{
            background: APP_SHELL_UI_POLICY.brand.activeNavBackground,
            border: APP_SHELL_UI_POLICY.brand.activeNavBorder,
          }}
        />
      )}
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full"
          style={{
            height: '60%',
            background: 'var(--glc-blue)',
            boxShadow: APP_SHELL_UI_POLICY.brand.activeNavGlow,
          }}
        />
      )}
      <Icon
        className="relative w-4 h-4 flex-shrink-0"
        style={{ color: active ? 'var(--glc-blue)' : APP_SHELL_UI_POLICY.colors.white038 }}
      />
      <span className="relative flex-1 truncate">{label}</span>
      {badge && (
        <span
          className="relative rounded-full px-1.5 py-0.5 text-[length:var(--text-2xs)] font-semibold tabular-nums"
          style={{
            backgroundColor: active
              ? APP_SHELL_UI_POLICY.brand.activeBadgeBackground
              : APP_SHELL_UI_POLICY.colors.white08,
            color: active ? 'var(--glc-blue)' : APP_SHELL_UI_POLICY.colors.white038,
            border: active ? APP_SHELL_UI_POLICY.brand.activeBadgeBorder : '1px solid transparent',
          }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
}

