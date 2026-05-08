import {
  Bell,
  CaretLeft,
  GearSix,
  Lightning,
  MagnifyingGlass,
  PlusCircle,
  SignOut,
} from '@phosphor-icons/react';
import { Link, NavLink } from 'react-router';
import type { User } from '@supabase/supabase-js';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
import { GlcLogo } from '../../GlcLogo';
import { ThemeToggle } from '../../ThemeToggle';
import { cn } from '../../ui/utils';
import { APP_SHELL_UI_POLICY } from '../config/app-shell-ui-policy';
import { SidebarNavLink } from './SidebarNavLink';

type DesktopSidebarProps = {
  open: boolean;
  navItems: import('../../../lib/app-shell-nav').AppShellNavItem[];
  sectionLabel: string;
  roleUnknown: boolean;
  isGuest: boolean;
  isClient: boolean;
  isConsultant: boolean;
  isAuthenticated: boolean;
  pathname: string;
  locationSearch: string;
  unreadCount: number;
  user: User | null;
  profile: { full_name: string | null } | null;
  roleDisplayName: string | null;
  onOpenNotifications: () => void;
  onCloseMobileMenu: () => void;
  onCollapse: () => void;
  onSignOut: () => void | Promise<void>;
  shellCopy: import('../../../config/app-shell-copy').AppShellCopy;
};

export function DesktopSidebar({
  open,
  navItems,
  sectionLabel,
  roleUnknown,
  isGuest,
  isClient,
  isConsultant,
  isAuthenticated,
  pathname,
  locationSearch,
  unreadCount,
  user,
  profile,
  roleDisplayName,
  onOpenNotifications,
  onCloseMobileMenu,
  onCollapse,
  onSignOut,
  shellCopy,
}: DesktopSidebarProps) {
  if (!open) return null;

  return (
    <aside
      className="ds-app-shell-sidebar relative border-r-[var(--sidebar-border)] hidden w-[var(--app-shell-sidebar-narrow-width)] flex-shrink-0 flex-col overflow-hidden sm:flex"
    >
      <div className="ds-app-shell-sidebar-mesh" aria-hidden />

      <div className="ds-app-shell-sidebar-header relative">
        <Link to="/" className="inline-flex items-center" aria-label={shellCopy.aria.home}>
          <GlcLogo variant="auto" className="h-8" />
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-[var(--app-shell-sidebar-control-bg)] text-[var(--sidebar-foreground)] transition-colors"
          onClick={onCollapse}
          aria-label={shellCopy.aria.collapseWorkspace}
          title={shellCopy.aria.collapseWorkspace}
        >
          <CaretLeft className="h-4 w-4" weight="bold" />
        </button>
      </div>

      {isConsultant && !roleUnknown && (
        <div className="relative px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-[var(--app-shell-sidebar-control-border)] bg-[var(--app-shell-sidebar-search-slot-bg)] px-3 py-2 text-left text-xs text-[var(--app-shell-sidebar-search-fg)] transition-[background,border-color] duration-200"
          >
            <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left">{shellCopy.sidebar.searchPlaceholder}</span>
            <span
              className="rounded bg-[var(--app-shell-sidebar-kbd-bg)] px-1 py-0.5 font-mono text-[length:var(--text-2xs)] tracking-normal text-[var(--app-shell-sidebar-kbd-fg)]"
            >
              {shellCopy.sidebar.searchShortcut}
            </span>
          </button>
        </div>
      )}

      <nav className="relative flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 py-1.5 text-[var(--app-shell-sidebar-caps-fg)] text-xs font-bold tracking-[var(--tracking-drawer-caps)]">
          {sectionLabel}
        </div>

        {roleUnknown && Array.from({ length: APP_SHELL_UI_POLICY.nav.skeletonCount }).map((_, i) => (
          <div
            key={`nav-skeleton-${i}`}
            className="mx-2 mb-1 h-8 animate-pulse rounded-lg bg-[var(--app-shell-sidebar-control-bg)]"
          />
        ))}

        {!roleUnknown && navItems.map((item) => (
          <div key={item.to ?? item.label}>
            <SidebarNavLink
              item={item}
              pathname={pathname}
              locationSearch={locationSearch}
              itemKey={item.label}
              onClick={onCloseMobileMenu}
            />
            {item.to === APP_ROUTE_PATHS.adminDiscovery && (
              <div className="mx-2 my-2 h-px bg-[var(--sidebar-border)]" />
            )}
          </div>
        ))}

        <div className="mx-2 my-2 h-px bg-[var(--sidebar-border)]" />

        {!isGuest && (isClient || roleUnknown) ? (
          <NavLink
            to={APP_ROUTE_PATHS.portalAuditNew}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm no-underline transition-[color,background] duration-200',
                isActive
                  ? 'bg-[var(--app-shell-sidebar-active-row-bg)] text-[var(--sidebar-foreground)]'
                  : 'text-[var(--app-shell-sidebar-link-fg)]',
              )
            }
            onClick={onCloseMobileMenu}
          >
            <PlusCircle className="text-info h-4 w-4 flex-shrink-0" />
            <span>{shellCopy.sidebar.newAudit}</span>
          </NavLink>
        ) : !isGuest ? (
          <NavLink
            to={APP_ROUTE_PATHS.auditNew}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm no-underline transition-[color,background] duration-200',
                isActive
                  ? 'bg-[var(--app-shell-sidebar-active-row-bg)] text-[var(--sidebar-foreground)]'
                  : 'text-[var(--app-shell-sidebar-link-fg)]',
              )
            }
            onClick={onCloseMobileMenu}
          >
            <Lightning className="text-warning h-4 w-4 flex-shrink-0" />
            <span>{shellCopy.sidebar.newAuditConsultant}</span>
          </NavLink>
        ) : (
          <NavLink
            to={APP_ROUTE_PATHS.login}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm no-underline transition-[color,background] duration-200',
                isActive
                  ? 'bg-[var(--app-shell-sidebar-active-row-bg)] text-[var(--sidebar-foreground)]'
                  : 'text-[var(--app-shell-sidebar-link-fg)]',
              )
            }
            onClick={onCloseMobileMenu}
          >
            <PlusCircle className="text-info h-4 w-4 flex-shrink-0" />
            <span>{shellCopy.sidebar.registerToContinue}</span>
          </NavLink>
        )}
      </nav>

      <div className="relative space-y-0.5 border-t-[length:var(--border-width-default)] border-t-[var(--app-shell-sidebar-hairline)] px-2 py-2">
        <div
          className="mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
        >
          <span className="text-xs font-medium text-[var(--app-shell-sidebar-caps-fg)]">
            {shellCopy.sidebar.theme}
          </span>
          <ThemeToggle variant="sidebar" />
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--app-shell-sidebar-search-fg)] transition-all"
          onClick={onOpenNotifications}
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{shellCopy.sidebar.notifications}</span>
          {unreadCount > 0 && (
            <span
              className="text-info rounded-full border border-info/25 bg-info/15 px-1.5 py-0.5 text-[length:var(--text-2xs)] font-semibold tabular-nums"
            >
              {unreadCount}
            </span>
          )}
        </button>
        {!isGuest && (
          <NavLink
            to={APP_ROUTE_PATHS.settings}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm no-underline transition-all ${
              pathname === APP_ROUTE_PATHS.settings
                ? 'bg-[var(--app-shell-sidebar-active-row-bg)] text-[var(--sidebar-foreground)]'
                : 'bg-transparent text-[var(--app-shell-sidebar-link-fg)]'
            }`}
            onClick={onCloseMobileMenu}
          >
            <GearSix className="w-3.5 h-3.5" />
            {shellCopy.sidebar.settings}
          </NavLink>
        )}

        {isAuthenticated && user && (
          <div
            className="mt-1 flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--sidebar-border)] bg-[var(--callout-info-bg)] px-2.5 py-2"
          >
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gradient-brand-cta)] text-xs font-bold text-[var(--on-gradient-brand-fg)] shadow-[var(--glow-blue-sm)]"
            >
              {(user.email || (isGuest ? shellCopy.sidebar.guestInitial : shellCopy.sidebar.userInitial))[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium leading-none text-[var(--sidebar-foreground)]">
                {profile?.full_name?.trim() || user.email?.split('@')[0] || (isGuest ? shellCopy.sidebar.guestDisplay : shellCopy.sidebar.userDisplay)}
              </div>
              <div className="mt-[var(--space-0-5)] text-[length:var(--text-2xs)] tracking-[var(--tracking-role-meta)] text-[var(--app-shell-sidebar-caps-fg)]">
                {roleDisplayName ?? (isClient ? shellCopy.sidebar.fallbackRoleClient : isGuest ? shellCopy.sidebar.fallbackRoleGuest : shellCopy.sidebar.fallbackRoleAdmin)}
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="ds-touch-target flex-shrink-0 text-[var(--app-shell-sidebar-link-icon)]"
              title={shellCopy.sidebar.signOutTitle}
            >
              <SignOut className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

