import { GearSix, Lightning, PlusCircle, SignOut, X } from '@phosphor-icons/react';
import { NavLink } from 'react-router';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
import { APP_SHELL_UI_POLICY } from '../config/app-shell-ui-policy';
import { SidebarNavLink } from './SidebarNavLink';

type MobileDrawerProps = {
  open: boolean;
  navItems: import('../../../lib/app-shell-nav').AppShellNavItem[];
  sectionLabel: string;
  roleUnknown: boolean;
  isGuest: boolean;
  isClient: boolean;
  isAuthenticated: boolean;
  pathname: string;
  onClose: () => void;
  onSignOut: () => void;
  shellCopy: import('../../../config/app-shell-copy').AppShellCopy;
};

export function MobileDrawer({
  open,
  navItems,
  sectionLabel,
  roleUnknown,
  isGuest,
  isClient,
  isAuthenticated,
  pathname,
  onClose,
  onSignOut,
  shellCopy,
}: MobileDrawerProps) {
  if (!open) return null;

  return (
    <div className="sm:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={shellCopy.aria.navigationMenu}>
      <button
        type="button"
        className="absolute inset-0 border-0 cursor-default"
        style={{ backgroundColor: APP_SHELL_UI_POLICY.overlay.mobileBackdrop }}
        aria-label={shellCopy.aria.closeMenu}
        onClick={onClose}
      />
      <div
        className="relative ml-auto flex h-full flex-col overflow-hidden glc-safe-pad-t glc-safe-pad-b"
        style={{
          width: APP_SHELL_UI_POLICY.mobile.drawerWidth,
          background: 'var(--gradient-ink-rich)',
          boxShadow: 'var(--shadow-ink)',
        }}
      >
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 flex-shrink-0 glc-safe-pad-x"
          style={{ borderBottom: `1px solid ${APP_SHELL_UI_POLICY.colors.white06}` }}
        >
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            {shellCopy.sidebar.menu}
          </span>
          <button
            type="button"
            className="glc-touch-target rounded-lg border-0 flex items-center justify-center"
            style={{ backgroundColor: APP_SHELL_UI_POLICY.colors.white08, color: 'rgba(255,255,255,0.85)' }}
            onClick={onClose}
            aria-label={shellCopy.aria.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 glc-safe-pad-x">
          <div
            className="px-2 py-1.5"
            style={{
              color: APP_SHELL_UI_POLICY.colors.white035,
              fontSize: APP_SHELL_UI_POLICY.nav.sectionCaptionSizePx,
              letterSpacing: '0.14em',
              fontWeight: 700,
            }}
          >
            {sectionLabel}
          </div>
          {!roleUnknown && navItems.map((item) => (
            <SidebarNavLink
              key={`drawer-${item.label}`}
              item={item}
              pathname={pathname}
              itemKey={`drawer-${item.label}`}
              onClick={onClose}
            />
          ))}
          {roleUnknown && (
            <p style={{ color: APP_SHELL_UI_POLICY.colors.white045, fontSize: 'var(--text-sm)', padding: 'var(--space-3)' }}>
              {shellCopy.sidebar.loadingWorkspace}
            </p>
          )}

          <div className="mx-2 my-3" style={{ height: '1px', background: APP_SHELL_UI_POLICY.colors.white06 }} />

          {!isGuest && (isClient || roleUnknown) && (
            <NavLink
              to={APP_ROUTE_PATHS.portalAuditNew}
              className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
              style={{ color: 'var(--glc-blue)', fontSize: 'var(--text-sm)' }}
              onClick={onClose}
            >
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.newAudit}
            </NavLink>
          )}
          {!isGuest && !isClient && !roleUnknown && (
            <NavLink
              to={APP_ROUTE_PATHS.auditNew}
              className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
              style={{ color: 'var(--glc-orange-light)', fontSize: 'var(--text-sm)' }}
              onClick={onClose}
            >
              <Lightning className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.newAuditConsultant}
            </NavLink>
          )}
          {isGuest && (
            <NavLink
              to={APP_ROUTE_PATHS.login}
              className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
              style={{ color: 'var(--glc-blue)', fontSize: 'var(--text-sm)' }}
              onClick={onClose}
            >
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.registerToContinue}
            </NavLink>
          )}

          {!isGuest && (
            <NavLink
              to={APP_ROUTE_PATHS.settings}
              className="flex items-center gap-2.5 px-2.5 py-3 rounded-lg no-underline glc-touch-target"
              style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-sm)' }}
              onClick={onClose}
            >
              <GearSix className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.settings}
            </NavLink>
          )}

          {isAuthenticated && (
            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-2.5 py-3 rounded-lg glc-touch-target border-0 text-left"
              style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--text-sm)' }}
              onClick={onSignOut}
            >
              <SignOut className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.signOut}
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

