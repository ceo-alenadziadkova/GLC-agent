import { GearSix, Lightning, PlusCircle, SignOut, X } from '@phosphor-icons/react';
import { NavLink } from 'react-router';
import { APP_ROUTE_PATHS } from '../../../config/route-paths';
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
        className="absolute inset-0 cursor-default border-0 bg-[var(--overlay-backdrop)]"
        aria-label={shellCopy.aria.closeMenu}
        onClick={onClose}
      />
      <div
        className="ds-app-shell-sidebar relative ml-auto flex h-full w-[var(--app-shell-drawer-width)] flex-col overflow-hidden shadow-[var(--shadow-ink)] glc-safe-pad-t glc-safe-pad-b"
      >
        <div className="ds-app-shell-sidebar-mesh" aria-hidden />
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--sidebar-border)] px-4 py-3 glc-safe-pad-x"
        >
          <span className="text-[length:var(--text-sm)] font-semibold ds-app-drawer-text">
            {shellCopy.sidebar.menu}
          </span>
          <button
            type="button"
            className="glc-touch-target ds-app-drawer-text flex items-center justify-center rounded-lg border-0 bg-[var(--sidebar-border)]"
            onClick={onClose}
            aria-label={shellCopy.aria.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 glc-safe-pad-x">
          <div
            className="px-2 py-1.5 text-[length:var(--text-2xs)] font-bold tracking-[var(--tracking-drawer-caps)] text-[color:var(--app-shell-sidebar-caps-fg)]"
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
            <p className="p-[var(--space-3)] text-[length:var(--text-sm)] text-[color:var(--overlay-white-45)]">
              {shellCopy.sidebar.loadingWorkspace}
            </p>
          )}

          <div className="mx-2 my-3 h-px bg-[var(--sidebar-border)]" />

          {!isGuest && (isClient || roleUnknown) && (
            <NavLink
              to={APP_ROUTE_PATHS.portalAuditNew}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-3 text-[var(--glc-blue)] no-underline glc-touch-target"
              onClick={onClose}
            >
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.newAudit}
            </NavLink>
          )}
          {!isGuest && !isClient && !roleUnknown && (
            <NavLink
              to={APP_ROUTE_PATHS.auditNew}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-3 text-[var(--glc-orange)] no-underline glc-touch-target"
              onClick={onClose}
            >
              <Lightning className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.newAuditConsultant}
            </NavLink>
          )}
          {isGuest && (
            <NavLink
              to={APP_ROUTE_PATHS.login}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-3 text-[var(--glc-blue)] no-underline glc-touch-target"
              onClick={onClose}
            >
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.registerToContinue}
            </NavLink>
          )}

          {!isGuest && (
            <NavLink
              to={APP_ROUTE_PATHS.settings}
              className="ds-app-drawer-text-muted flex items-center gap-2.5 rounded-lg px-2.5 py-3 no-underline glc-touch-target"
              onClick={onClose}
            >
              <GearSix className="w-5 h-5 flex-shrink-0" />
              {shellCopy.sidebar.settings}
            </NavLink>
          )}

          {isAuthenticated && (
            <button
              type="button"
              className="ds-app-drawer-text-faint glc-touch-target w-full rounded-lg border-0 px-2.5 py-3 text-left"
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

