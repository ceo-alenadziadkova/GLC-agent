import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import {
  GearSix, Bell, MagnifyingGlass, Lightning, SignOut,
  PlusCircle, List, X, CaretLeft, CaretRight,
} from '@phosphor-icons/react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useNotifications } from '../hooks/useNotifications';
import { GlcLogo } from './GlcLogo';
import { ThemeToggle } from './ThemeToggle';
import { NotificationCenter } from './NotificationCenter';
import type { NotificationItem } from '../data/auditTypes';
import { useClientPortalPipelineOptional } from '../context/ClientPortalPipelineContext';
import {
  type AppShellNavItem,
  buildClientNav,
  buildConsultantNav,
  buildGuestNav,
  buildMobileBottomNavItems,
  isNavItemActive,
} from '../lib/app-shell-nav';
import { APP_SHELL_COPY } from '../config/app-shell-copy';
import { APP_ROUTE_PATHS, APP_ROUTE_PATTERNS, buildAppRoute } from '../config/route-paths';

export type { AppShellNavItem } from '../lib/app-shell-nav';

function useCurrentAuditId(): string | null {
  const { pathname } = useLocation();
  const match = pathname.match(APP_ROUTE_PATTERNS.mainAuditScope)
    ?? pathname.match(APP_ROUTE_PATTERNS.portalAuditScope);
  return match ? match[1] : null;
}

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();
  const {
    profile,
    isConsultant,
    isClient,
    isGuest,
    roleDisplayName,
    loading: profileLoading,
  } = useProfile();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  /** Tailwind `sm` (640px): only one page `<h1>` should be in the accessibility tree at a time. */
  const [isSmUp, setIsSmUp] = useState(false);
  const {
    items: notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    reload: reloadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const auditId = useCurrentAuditId();
  const clientPipelineCtx = useClientPortalPipelineOptional();
  const clientPipelineNavAllowed =
    Boolean(auditId) &&
    Boolean(
      clientPipelineCtx && clientPipelineCtx.auditId === auditId && clientPipelineCtx.allowed,
    );

  const roleUnknown = isAuthenticated && (profileLoading || !profile?.role);
  const NAV = isGuest
    ? buildGuestNav()
    : roleUnknown
      ? buildClientNav(auditId, false)
      : isClient
        ? buildClientNav(auditId, clientPipelineNavAllowed)
        : buildConsultantNav(auditId);
  const { aria: shellAria, sectionLabels: shellSections, sidebar: shellSidebar, mobileHeader: shellMobile } = APP_SHELL_COPY;
  const sectionLabel = isGuest
    ? shellSections.snapshot
    : roleUnknown
      ? shellSections.workspaceUnknown
      : isClient
        ? shellSections.clientWorkspace
        : shellSections.adminWorkspace;

  const mobileBottomNav = buildMobileBottomNavItems(NAV, {
    isClient: Boolean(isClient || roleUnknown),
    isGuest: Boolean(isGuest),
    roleUnknown,
  });

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const onMq = () => setIsSmUp(mql.matches);
    onMq();
    mql.addEventListener('change', onMq);
    return () => mql.removeEventListener('change', onMq);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const openNotification = (item: NotificationItem) => {
    if (!item.is_read) markAsRead(item.id);
    const route = typeof item.payload?.route === 'string' ? item.payload.route : null;
    const requestId = typeof item.payload?.request_id === 'string' ? item.payload.request_id : null;
    if (route) {
      navigate(route);
      setNotificationsOpen(false);
      return;
    }
    if (requestId) {
      navigate(isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.adminRequests);
      setNotificationsOpen(false);
      return;
    }
    if (item.audit_id) {
      if (item.kind === 'pipeline' || item.kind === 'review') {
        navigate(buildAppRoute.pipeline(item.audit_id));
      } else {
        navigate(buildAppRoute.audit(item.audit_id));
      }
      setNotificationsOpen(false);
      return;
    }
    if (item.kind === 'intake' && isConsultant) {
      navigate(APP_ROUTE_PATHS.adminRequests);
      setNotificationsOpen(false);
    }
  };

  const renderSidebarNavLink = (to: string | null, Icon: AppShellNavItem['icon'], label: string, badge: string | null, key: string) => {
    if (!to) {
      return (
        <div
          key={key}
          className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.20)', fontSize: 'var(--text-sm)', cursor: 'not-allowed' }}
        >
          <Icon className="relative w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <span className="relative flex-1 truncate">{label}</span>
        </div>
      );
    }
    const active = isNavItemActive(location.pathname, to);
    return (
      <NavLink
        key={key}
        to={to}
        className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline transition-all"
        style={{
          color: active ? 'var(--primary-foreground)' : 'rgba(255,255,255,0.46)',
          fontSize: 'var(--text-sm)',
          fontWeight: active ? 500 : 400,
          transition: 'color var(--ease-fast)',
        }}
        onClick={() => setMobileMenuOpen(false)}
      >
        {active && (
          <span
            className="absolute inset-0 rounded-lg transition-[opacity,transform] duration-200 ease-out"
            style={{
              background: 'linear-gradient(90deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
              border: '1px solid rgba(28,189,255,0.18)',
            }}
          />
        )}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full"
            style={{
              height: '60%',
              background: 'var(--glc-blue)',
              boxShadow: '0 0 8px rgba(28,189,255,0.7)',
            }}
          />
        )}
        <Icon
          className="relative w-4 h-4 flex-shrink-0"
          style={{ color: active ? 'var(--glc-blue)' : 'rgba(255,255,255,0.38)' }}
        />
        <span className="relative flex-1 truncate">{label}</span>
        {badge && (
          <span
            className="relative text-xs px-1.5 py-0.5 rounded-full font-semibold tabular-nums"
            style={{
              backgroundColor: active ? 'rgba(28,189,255,0.22)' : 'rgba(255,255,255,0.08)',
              color: active ? 'var(--glc-blue)' : 'rgba(255,255,255,0.38)',
              fontSize: '10px',
              border: active ? '1px solid rgba(28,189,255,0.25)' : '1px solid transparent',
            }}
          >
            {badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div
      className="min-h-0 flex flex-col sm:flex-row overflow-hidden h-[100dvh] sm:h-screen"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {!desktopSidebarCollapsed && (
        <aside
          className="hidden sm:flex w-[216px] flex-shrink-0 flex-col overflow-hidden relative"
        style={{
          background: 'var(--gradient-ink-rich)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
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
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Link to="/" className="inline-flex items-center" aria-label={shellAria.home}>
            <GlcLogo variant="on-dark" className="h-12" />
          </Link>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-0 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.72)' }}
            onClick={() => setDesktopSidebarCollapsed(true)}
            aria-label={shellAria.collapseWorkspace}
            title={shellAria.collapseWorkspace}
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
                color: 'rgba(255,255,255,0.30)',
                fontSize: 'var(--text-xs)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--ease-fast), border-color var(--ease-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <MagnifyingGlass className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">{shellSidebar.searchPlaceholder}</span>
              <span
                className="px-1 py-0.5 rounded"
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0',
                }}
              >
                {shellSidebar.searchShortcut}
              </span>
            </button>
          </div>
        )}

        <nav className="relative flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
          <div
            className="px-2 py-1.5"
            style={{ color: 'rgba(255,255,255,0.20)', fontSize: '9px', letterSpacing: '0.14em', fontWeight: 700 }}
          >
            {sectionLabel}
          </div>

          {roleUnknown && (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={`nav-skeleton-${i}`}
                  className="mx-2 mb-1 h-8 rounded-lg animate-pulse"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                />
              ))}
            </>
          )}

          {!roleUnknown && NAV.map(({ to, icon: Icon, label, badge }) =>
            renderSidebarNavLink(to, Icon, label, badge, label))}

          <div className="mx-2 my-2" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {!isGuest && (isClient || roleUnknown) ? (
            <NavLink
              to={APP_ROUTE_PATHS.portalAuditNew}
              className="relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline"
              style={{
                color: 'rgba(255,255,255,0.38)',
                fontSize: 'var(--text-sm)',
                transition: 'color var(--ease-fast), background var(--ease-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(28,189,255,0.10)';
                (e.currentTarget as HTMLElement).style.color = 'var(--glc-blue)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
              <span>{shellSidebar.newAudit}</span>
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
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(242,79,29,0.10)';
                (e.currentTarget as HTMLElement).style.color = 'var(--glc-orange-light)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Lightning className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-orange)' }} />
              <span>{shellSidebar.newAuditConsultant}</span>
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
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(28,189,255,0.10)';
                (e.currentTarget as HTMLElement).style.color = 'var(--glc-blue)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
              <span>{shellSidebar.registerToContinue}</span>
            </NavLink>
          )}
        </nav>

        <div
          className="relative px-2 py-2 space-y-0.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="mb-1 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {shellSidebar.theme}
            </span>
            <ThemeToggle variant="sidebar" />
          </div>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all"
            style={{ color: 'rgba(255,255,255,0.30)', borderRadius: 'var(--radius-md)' }}
            onClick={() => setNotificationsOpen(true)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)';
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{shellSidebar.notifications}</span>
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
          {!isGuest &&
            [
              { icon: GearSix, label: shellSidebar.settings, to: APP_ROUTE_PATHS.settings },
            ].map(({ icon: I, label, to }) => {
              const active = location.pathname === APP_ROUTE_PATHS.settings;
              return (
                <NavLink
                  key={label}
                  to={to}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all no-underline"
                  style={{
                    color: active ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = active ? 'rgba(255,255,255,0.08)' : 'transparent';
                    (e.currentTarget as HTMLElement).style.color = active ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.30)';
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <I className="w-3.5 h-3.5" />{label}
                </NavLink>
              );
            })}

          {isAuthenticated && user && (
            <div
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mt-1 cursor-pointer"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
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
                {(user.email || (isGuest ? shellSidebar.guestInitial : shellSidebar.userInitial))[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-none" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {profile?.full_name?.trim() || user.email?.split('@')[0] || (isGuest ? shellSidebar.guestDisplay : shellSidebar.userDisplay)}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: 3, letterSpacing: '0.03em' }}>
                  {roleDisplayName ?? (isClient ? shellSidebar.fallbackRoleClient : isGuest ? shellSidebar.fallbackRoleGuest : shellSidebar.fallbackRoleAdmin)}
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex-shrink-0 glc-touch-target"
                style={{ color: 'rgba(255,255,255,0.30)' }}
                title={shellSidebar.signOutTitle}
              >
                <SignOut className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        </aside>
      )}

      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        {desktopSidebarCollapsed && (
          <button
            type="button"
            className="hidden sm:inline-flex absolute left-0 top-1/2 z-20 h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-lg border-0 transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-xs)',
            }}
            onClick={() => setDesktopSidebarCollapsed(false)}
            aria-label={shellAria.expandWorkspace}
            title={shellAria.expandWorkspace}
          >
            <CaretRight className="h-4 w-4" weight="bold" />
          </button>
        )}
        <header
          className="sm:hidden flex-shrink-0 flex items-center gap-2 border-b glc-safe-pad-x glc-safe-pad-t"
          aria-hidden={title ? isSmUp : undefined}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            minHeight: 'var(--glc-mobile-header-height)',
            boxShadow: 'var(--shadow-xs)',
            paddingBottom: 'var(--space-2)',
          }}
        >
          <Link to="/" className="inline-flex items-center flex-shrink-0" aria-label={shellAria.home}>
            <GlcLogo variant="auto" className="h-9" />
          </Link>
          <div className="flex-1 min-w-0">
            {title ? (
              <>
                <h1
                  className="truncate m-0"
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    letterSpacing: 'var(--tracking-tight)',
                    fontFamily: 'var(--font-display)',
                    lineHeight: 'var(--leading-tight)',
                  }}
                >
                  {title}
                </h1>
                {subtitle ? (
                  <p
                    className="truncate m-0 mt-0.5"
                    style={{
                      color: 'var(--text-tertiary)',
                      fontSize: 'var(--text-xs)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {subtitle}
                  </p>
                ) : null}
              </>
            ) : (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>{shellMobile.glcShortBrand}</span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions ? (
              <div className="flex items-center max-w-[40vw] overflow-hidden [&_a]:text-xs [&_a]:px-2 [&_a]:py-2 [&_a]:min-h-[var(--glc-touch-target-min)] [&_button]:min-h-[var(--glc-touch-target-min)]">
                {actions}
              </div>
            ) : null}
            <button
              type="button"
              className="relative glc-touch-target rounded-lg border-0 inline-flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
              onClick={() => setNotificationsOpen(true)}
              aria-label={shellAria.openNotifications}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span
                  className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--glc-blue)',
                    color: 'var(--primary-foreground)',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>
            <div className="glc-touch-target flex items-center justify-center">
              <ThemeToggle />
            </div>
            <button
              type="button"
              className="glc-touch-target rounded-lg border-0"
              style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
              onClick={() => setMobileMenuOpen(true)}
              aria-label={shellAria.openMenu}
            >
              <List className="w-5 h-5" weight="bold" />
            </button>
          </div>
        </header>

        {(title || actions) && (
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
        )}

        <main className="flex-1 overflow-y-auto min-h-0 glc-main-mobile-nav-pad">{children}</main>

        {mobileBottomNav.length > 0 && (
          <nav
            className="sm:hidden flex flex-shrink-0 border-t glc-safe-pad-x items-stretch justify-around"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              minHeight: 'var(--glc-mobile-nav-height)',
              paddingBottom: 'max(var(--space-2), env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -4px 12px rgba(11,17,32,0.06)',
            }}
            aria-label={shellAria.primaryNav}
          >
            {mobileBottomNav.map(({ to, icon: Icon, label }) => {
              const active = to ? isNavItemActive(location.pathname, to) : false;
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
                    style={{ fontSize: '10px', fontWeight: active ? 600 : 500, lineHeight: 1.2 }}
                  >
                    {label}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={shellAria.navigationMenu}>
          <button
            type="button"
            className="absolute inset-0 border-0 cursor-default"
            style={{ backgroundColor: 'rgba(8,15,30,0.45)' }}
            aria-label={shellAria.closeMenu}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="relative ml-auto flex h-full w-[min(20rem,88vw)] flex-col overflow-hidden glc-safe-pad-t glc-safe-pad-b"
            style={{
              background: 'var(--gradient-ink-rich)',
              boxShadow: 'var(--shadow-ink)',
            }}
          >
            <div
              className="flex items-center justify-between gap-2 px-4 py-3 flex-shrink-0 glc-safe-pad-x"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                {shellSidebar.menu}
              </span>
              <button
                type="button"
                className="glc-touch-target rounded-lg border-0 flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
                onClick={() => setMobileMenuOpen(false)}
                aria-label={shellAria.closeMenu}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 glc-safe-pad-x">
              <div
                className="px-2 py-1.5"
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.14em', fontWeight: 700 }}
              >
                {sectionLabel}
              </div>
              {!roleUnknown && NAV.map(({ to, icon: Icon, label, badge }) =>
                renderSidebarNavLink(to, Icon, label, badge, `drawer-${label}`))}
              {roleUnknown && (
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'var(--text-sm)', padding: 'var(--space-3)' }}>
                  {shellSidebar.loadingWorkspace}
                </p>
              )}

              <div className="mx-2 my-3" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

              {!isGuest && (isClient || roleUnknown) && (
                <NavLink
                  to={APP_ROUTE_PATHS.portalAuditNew}
                  className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
                  style={{ color: 'var(--glc-blue)', fontSize: 'var(--text-sm)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PlusCircle className="w-5 h-5 flex-shrink-0" />
                  {shellSidebar.newAudit}
                </NavLink>
              )}
              {!isGuest && !isClient && !roleUnknown && (
                <NavLink
                  to={APP_ROUTE_PATHS.auditNew}
                  className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
                  style={{ color: 'var(--glc-orange-light)', fontSize: 'var(--text-sm)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Lightning className="w-5 h-5 flex-shrink-0" />
                  {shellSidebar.newAuditConsultant}
                </NavLink>
              )}
              {isGuest && (
                <NavLink
                  to={APP_ROUTE_PATHS.login}
                  className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
                  style={{ color: 'var(--glc-blue)', fontSize: 'var(--text-sm)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <PlusCircle className="w-5 h-5 flex-shrink-0" />
                  {shellSidebar.registerToContinue}
                </NavLink>
              )}

              {!isGuest && (
                <NavLink
                  to={APP_ROUTE_PATHS.settings}
                  className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
                  style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-sm)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GearSix className="w-5 h-5 flex-shrink-0" />
                  {shellSidebar.settings}
                </NavLink>
              )}

              {isAuthenticated && (
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg glc-touch-target border-0 text-left"
                  style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--text-sm)' }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signOut();
                  }}
                >
                  <SignOut className="w-5 h-5 flex-shrink-0" />
                  {shellSidebar.signOut}
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      <NotificationCenter
        open={notificationsOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={notificationsLoading}
        error={notificationsError}
        onClose={() => setNotificationsOpen(false)}
        onRefresh={() => { void reloadNotifications({ force: true }); }}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onOpenNotification={openNotification}
      />
    </div>
  );
}
