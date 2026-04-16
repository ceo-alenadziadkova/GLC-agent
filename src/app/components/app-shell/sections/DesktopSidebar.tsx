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
      className="hidden sm:flex w-[216px] flex-shrink-0 flex-col overflow-hidden relative"
      style={{
        background: 'var(--gradient-ink-rich)',
        borderRight: `1px solid ${APP_SHELL_UI_POLICY.colors.white06}`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'var(--mesh-ink)',
          opacity: 0.5,
        }}
      />

      <div
        className="relative flex items-center justify-between gap-2 px-4 pt-5 pb-4"
        style={{ borderBottom: `1px solid ${APP_SHELL_UI_POLICY.colors.white05}` }}
      >
        <Link to="/" className="inline-flex items-center" aria-label={shellCopy.aria.home}>
          <GlcLogo variant="on-dark" className="h-12" />
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 transition-colors"
          style={{ backgroundColor: APP_SHELL_UI_POLICY.colors.white08, color: 'rgba(255,255,255,0.72)' }}
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
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: APP_SHELL_UI_POLICY.colors.white03,
              fontSize: 'var(--text-xs)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 'var(--radius-md)',
              transition: 'background var(--ease-fast), border-color var(--ease-fast)',
            }}
          >
            <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left">{shellCopy.sidebar.searchPlaceholder}</span>
            <span
              className="px-1 py-0.5 rounded"
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                backgroundColor: APP_SHELL_UI_POLICY.colors.white08,
                color: APP_SHELL_UI_POLICY.colors.white035,
                letterSpacing: '0',
              }}
            >
              {shellCopy.sidebar.searchShortcut}
            </span>
          </button>
        </div>
      )}

      <nav className="relative flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
        <div
          className="px-2 py-1.5"
          style={{
            color: 'rgba(255,255,255,0.20)',
            fontSize: APP_SHELL_UI_POLICY.nav.sectionCaptionSizePx,
            letterSpacing: '0.14em',
            fontWeight: 700,
          }}
        >
          {sectionLabel}
        </div>

        {roleUnknown && Array.from({ length: APP_SHELL_UI_POLICY.nav.skeletonCount }).map((_, i) => (
          <div
            key={`nav-skeleton-${i}`}
            className="mx-2 mb-1 h-8 rounded-lg animate-pulse"
            style={{ backgroundColor: APP_SHELL_UI_POLICY.colors.white08 }}
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

        <div className="mx-2 my-2" style={{ height: '1px', background: APP_SHELL_UI_POLICY.colors.white06 }} />

        {!isGuest && (isClient || roleUnknown) ? (
          <NavLink
            to={APP_ROUTE_PATHS.portalAuditNew}
            className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline"
            style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 'var(--text-sm)',
              transition: 'color var(--ease-fast), background var(--ease-fast)',
            }}
            onClick={onCloseMobileMenu}
          >
            <PlusCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
            <span>{shellCopy.sidebar.newAudit}</span>
          </NavLink>
        ) : !isGuest ? (
          <NavLink
            to={APP_ROUTE_PATHS.auditNew}
            className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline"
            style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 'var(--text-sm)',
              transition: 'color var(--ease-fast), background var(--ease-fast)',
            }}
            onClick={onCloseMobileMenu}
          >
            <Lightning className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-orange)' }} />
            <span>{shellCopy.sidebar.newAuditConsultant}</span>
          </NavLink>
        ) : (
          <NavLink
            to={APP_ROUTE_PATHS.login}
            className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline"
            style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 'var(--text-sm)',
              transition: 'color var(--ease-fast), background var(--ease-fast)',
            }}
            onClick={onCloseMobileMenu}
          >
            <PlusCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
            <span>{shellCopy.sidebar.registerToContinue}</span>
          </NavLink>
        )}
      </nav>

      <div
        className="relative px-2 py-2 space-y-0.5"
        style={{ borderTop: `1px solid ${APP_SHELL_UI_POLICY.colors.white05}` }}
      >
        <div
          className="mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <span className="text-xs font-medium" style={{ color: APP_SHELL_UI_POLICY.colors.white045 }}>
            {shellCopy.sidebar.theme}
          </span>
          <ThemeToggle variant="sidebar" />
        </div>
        <button
          type="button"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all"
          style={{ color: APP_SHELL_UI_POLICY.colors.white03, borderRadius: 'var(--radius-md)' }}
          onClick={onOpenNotifications}
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{shellCopy.sidebar.notifications}</span>
          {unreadCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums"
              style={{
                backgroundColor: 'rgba(28,189,255,0.15)',
                color: 'var(--glc-blue)',
                border: '1px solid rgba(28,189,255,0.25)',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        {!isGuest && (
          <NavLink
            to={APP_ROUTE_PATHS.settings}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all no-underline"
            style={{
              color: pathname === APP_ROUTE_PATHS.settings ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: pathname === APP_ROUTE_PATHS.settings ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
            onClick={onCloseMobileMenu}
          >
            <GearSix className="w-3.5 h-3.5" />
            {shellCopy.sidebar.settings}
          </NavLink>
        )}

        {isAuthenticated && user && (
          <div
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mt-1 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: `1px solid ${APP_SHELL_UI_POLICY.colors.white06}`,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: 'var(--gradient-brand)',
                color: 'var(--glc-ink)',
                boxShadow: '0 0 8px rgba(28,189,255,0.30)',
              }}
            >
              {(user.email || (isGuest ? shellCopy.sidebar.guestInitial : shellCopy.sidebar.userInitial))[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium leading-none" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {profile?.full_name?.trim() || user.email?.split('@')[0] || (isGuest ? shellCopy.sidebar.guestDisplay : shellCopy.sidebar.userDisplay)}
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: 3, letterSpacing: '0.03em' }}>
                {roleDisplayName ?? (isClient ? shellCopy.sidebar.fallbackRoleClient : isGuest ? shellCopy.sidebar.fallbackRoleGuest : shellCopy.sidebar.fallbackRoleAdmin)}
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="flex-shrink-0 glc-touch-target"
              style={{ color: APP_SHELL_UI_POLICY.colors.white03 }}
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

