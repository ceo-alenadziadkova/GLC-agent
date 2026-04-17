import { useLocation } from 'react-router';
import { APP_SHELL_COPY } from '../../../config/app-shell-copy';
import { APP_ROUTE_PATTERNS } from '../../../config/route-paths';
import {
  buildClientNav,
  buildConsultantNav,
  buildGuestNav,
  buildMobileBottomNavItems,
  type AppShellNavItem,
} from '../../../lib/app-shell-nav';
import type { ClientPortalPipelineContextValue } from '../../../context/ClientPortalPipelineContext';

type UseAppShellNavModelArgs = {
  isGuest: boolean;
  isClient: boolean;
  isAuthenticated: boolean;
  profileLoading: boolean;
  profileRole: string | undefined;
  auditId: string | null;
  clientPipelineCtx: ClientPortalPipelineContextValue | null;
};

export type AppShellNavModel = {
  roleUnknown: boolean;
  navItems: AppShellNavItem[];
  mobileBottomNav: AppShellNavItem[];
  sectionLabel: string;
};

export function useCurrentAuditId(): string | null {
  const { pathname } = useLocation();
  const match = pathname.match(APP_ROUTE_PATTERNS.mainAuditScope)
    ?? pathname.match(APP_ROUTE_PATTERNS.portalAuditScope);
  return match ? match[1] : null;
}

export function useAppShellNavModel(args: UseAppShellNavModelArgs): AppShellNavModel {
  const roleUnknown = args.isAuthenticated && (args.profileLoading || !args.profileRole);
  const clientPipelineNavAllowed =
    Boolean(args.auditId) &&
    Boolean(
      args.clientPipelineCtx &&
      args.clientPipelineCtx.auditId === args.auditId &&
      args.clientPipelineCtx.allowed,
    );

  const navItems = args.isGuest
    ? buildGuestNav()
    : roleUnknown
      ? buildClientNav(args.auditId, false)
      : args.isClient
        ? buildClientNav(args.auditId, clientPipelineNavAllowed)
        : buildConsultantNav(args.auditId);

  const { sectionLabels } = APP_SHELL_COPY;
  const sectionLabel = args.isGuest
    ? sectionLabels.snapshot
    : roleUnknown
      ? sectionLabels.workspaceUnknown
      : args.isClient
        ? sectionLabels.clientWorkspace
        : sectionLabels.adminWorkspace;

  const mobileBottomNav = buildMobileBottomNavItems(navItems, {
    isClient: Boolean(args.isClient || roleUnknown),
    isGuest: Boolean(args.isGuest),
    roleUnknown,
  });

  return {
    roleUnknown,
    navItems,
    mobileBottomNav,
    sectionLabel,
  };
}

