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
      className="border-r-[var(--sidebar-border)] hidden w-[var(--app-shell-sidebar-narrow-width)] flex-shrink-0 flex-col overflow-hidden bg-[var(--gradient-ink-rich)] sm:flex"
    >
      <div className="pointer-events-none absolute inset-0 bg-[var(--mesh-ink)] opacity-50" />

      <div className="border-b-[var(--overlay-white-15)] relative flex items-center justify-between gap-2 px-4 pb-4 pt-5">
        <Link to="/" className="inline-flex items-center" aria-label={shellCopy.aria.home}>
          <GlcLogo variant="on-dark" className="h-12" />
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-[var(--overlay-white-20)] text-[var(--sidebar-foreground)] transition-colors"
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
            className="w-full rounded-lg border border-[var(--overlay-white-15)] bg-[var(--overlay-white-15)] px-3 py-2 text-xs text-[var(--overlay-white-30)] transition-[background,border-color] duration-200"
          >
            <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left">{shellCopy.sidebar.searchPlaceholder}</span>
            <span
              className="rounded bg-[var(--overlay-white-20)] px-1 py-0.5 font-mono text-[length:var(--text-2xs)] tracking-normal text-[var(--overlay-white-35)]"
            >
              {shellCopy.sidebar.searchShortcut}
            </span>
          </button>
        </div>
      )}

      <nav className="relative flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 py-1.5 text-[var(--overlay-white-20)] text-xs font-bold tracking-[var(--tracking-drawer-caps)]">
          {sectionLabel}
        </div>

        {roleUnknown && Array.from({ length: APP_SHELL_UI_POLICY.nav.skeletonCount }).map((_, i) => (
          <div
            key={`nav-skeleton-${i}`}
            className="mx-2 mb-1 h-8 animate-pulse rounded-lg bg-[var(--overlay-white-20)]"
          />
        ))}

        {!roleUnknown && navItems.map((item) => (
          <SidebarNavLink
            key={item.label}
            item={item}
            pathname={pathname}
            itemKey={item.label}
            onClick={onCloseMobileMenu}
          />
        ))}

        <div className="mx-2 my-2 h-px bg-[var(--sidebar-border)]" />

        {!isGuest && (isClient || roleUnknown) ? (
          <NavLink
            to={APP_ROUTE_PATHS.portalAuditNew}
            className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--overlay-white-38)] no-underline transition-[color,background] duration-200"
            onClick={onCloseMobileMenu}
          >
            <PlusCircle className="text-info h-4 w-4 flex-shrink-0" />
            <span>{shellCopy.sidebar.newAudit}</span>
          </NavLink>
        ) : !isGuest ? (
          <NavLink
            to={APP_ROUTE_PATHS.auditNew}
            className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--overlay-white-38)] no-underline transition-[color,background] duration-200"
            onClick={onCloseMobileMenu}
          >
            <Lightning className="text-warning h-4 w-4 flex-shrink-0" />
            <span>{shellCopy.sidebar.newAuditConsultant}</span>
          </NavLink>
        ) : (
          <NavLink
            to={APP_ROUTE_PATHS.login}
            className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--overlay-white-38)] no-underline transition-[color,background] duration-200"
            onClick={onCloseMobileMenu}
          >
            <PlusCircle className="text-info h-4 w-4 flex-shrink-0" />
            <span>{shellCopy.sidebar.registerToContinue}</span>
          </NavLink>
        )}
      </nav>

      <div className="border-t-[var(--overlay-white-15)] relative space-y-0.5 px-2 py-2">
        <div
          className="mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
        >
          <span className="text-xs font-medium text-[var(--overlay-white-45)]">
            {shellCopy.sidebar.theme}
          </span>
          <ThemeToggle variant="sidebar" />
        </div>
        <button
          type="button"
          className="w-full rounded-lg px-2.5 py-2 text-sm text-[var(--overlay-white-30)] transition-all"
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
                ? 'bg-[var(--overlay-white-20)] text-[var(--text-inverse)]'
                : 'bg-transparent text-[var(--overlay-white-30)]'
            }`}
            onClick={onCloseMobileMenu}
          >
            <GearSix className="w-3.5 h-3.5" />
            {shellCopy.sidebar.settings}
          </NavLink>
        )}

        {isAuthenticated && user && (
          <div
            className="mt-1 flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--sidebar-border)] bg-[var(--glc-blue-muted-faint)] px-2.5 py-2"
          >
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gradient-brand)] text-xs font-bold text-[var(--glc-ink)] shadow-[var(--glow-blue-sm)]"
            >
              {(user.email || (isGuest ? shellCopy.sidebar.guestInitial : shellCopy.sidebar.userInitial))[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium leading-none text-[var(--text-inverse)]">
                {profile?.full_name?.trim() || user.email?.split('@')[0] || (isGuest ? shellCopy.sidebar.guestDisplay : shellCopy.sidebar.userDisplay)}
              </div>
              <div className="mt-[var(--space-0-5)] text-[length:var(--text-2xs)] tracking-[var(--tracking-role-meta)] text-[var(--overlay-white-30)]">
                {roleDisplayName ?? (isClient ? shellCopy.sidebar.fallbackRoleClient : isGuest ? shellCopy.sidebar.fallbackRoleGuest : shellCopy.sidebar.fallbackRoleAdmin)}
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="glc-touch-target flex-shrink-0 text-[var(--overlay-white-30)]"
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

