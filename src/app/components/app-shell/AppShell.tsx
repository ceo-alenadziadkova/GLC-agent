import { CaretRight } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router';
import { NotificationCenter } from '../NotificationCenter';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useProfile } from '../../hooks/useProfile';
import type { NotificationItem } from '../../data/auditTypes';
import { APP_SHELL_COPY } from '../../config/app-shell-copy';
import { useClientPortalPipelineOptional } from '../../context/ClientPortalPipelineContext';
import { useAppShellNavModel, useCurrentAuditId } from './hooks/useAppShellNavModel';
import { useAppShellState } from './hooks/useAppShellState';
import { resolveNotificationRoute } from './services/notification-navigation.service';
import { DesktopHeader } from './sections/DesktopHeader';
import { DesktopSidebar } from './sections/DesktopSidebar';
import { MobileBottomNav } from './sections/MobileBottomNav';
import { MobileDrawer } from './sections/MobileDrawer';
import { MobileHeader } from './sections/MobileHeader';

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
  const {
    items: notifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    reload: reloadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const {
    notificationsOpen,
    setNotificationsOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
    isSmUp,
  } = useAppShellState();
  const auditId = useCurrentAuditId();
  const clientPipelineCtx = useClientPortalPipelineOptional();
  const { roleUnknown, navItems, mobileBottomNav, sectionLabel } = useAppShellNavModel({
    isGuest,
    isClient,
    isAuthenticated,
    profileLoading,
    profileRole: profile?.role,
    auditId,
    clientPipelineCtx,
  });

  const openNotification = (item: NotificationItem) => {
    if (!item.is_read) markAsRead(item.id);
    const route = resolveNotificationRoute({
      item,
      isClient,
      isConsultant,
    });
    if (!route) return;
    navigate(route);
    setNotificationsOpen(false);
  };

  return (
    <div className="min-h-0 flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-canvas)] sm:h-screen sm:flex-row">
      <DesktopSidebar
        open={!desktopSidebarCollapsed}
        navItems={navItems}
        sectionLabel={sectionLabel}
        roleUnknown={roleUnknown}
        isGuest={isGuest}
        isClient={Boolean(isClient || roleUnknown)}
        isConsultant={isConsultant}
        isAuthenticated={isAuthenticated}
        pathname={location.pathname}
        locationSearch={location.search}
        unreadCount={unreadCount}
        user={user}
        profile={profile}
        roleDisplayName={roleDisplayName}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
        onCollapse={() => setDesktopSidebarCollapsed(true)}
        onSignOut={signOut}
        shellCopy={APP_SHELL_COPY}
      />

      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        {desktopSidebarCollapsed && (
          <button
            type="button"
            className="absolute left-0 top-1/2 z-20 hidden h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-lg border-0 bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-[var(--shadow-xs)] transition-colors sm:inline-flex"
            onClick={() => setDesktopSidebarCollapsed(false)}
            aria-label={APP_SHELL_COPY.aria.expandWorkspace}
            title={APP_SHELL_COPY.aria.expandWorkspace}
          >
            <CaretRight className="h-4 w-4" weight="bold" />
          </button>
        )}

        <MobileHeader
          title={title}
          subtitle={subtitle}
          actions={actions}
          isSmUp={isSmUp}
          unreadCount={unreadCount}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          shellCopy={APP_SHELL_COPY}
        />

        <DesktopHeader title={title} subtitle={subtitle} actions={actions} />

        <main className="flex-1 overflow-y-auto min-h-0 glc-main-mobile-nav-pad">{children}</main>

        <MobileBottomNav
          items={mobileBottomNav}
          pathname={location.pathname}
          locationSearch={location.search}
          navAriaLabel={APP_SHELL_COPY.aria.primaryNav}
        />
      </div>

      <MobileDrawer
        open={mobileMenuOpen}
        navItems={navItems}
        sectionLabel={sectionLabel}
        roleUnknown={roleUnknown}
        isGuest={isGuest}
        isClient={isClient}
        isAuthenticated={isAuthenticated}
        pathname={location.pathname}
        locationSearch={location.search}
        onClose={() => setMobileMenuOpen(false)}
        onSignOut={() => {
          setMobileMenuOpen(false);
          void signOut();
        }}
        shellCopy={APP_SHELL_COPY}
      />

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

