import { Link } from 'react-router';
import {
  Plus,
  Tray,
  Lightning,
  MagnifyingGlass,
  ArrowsClockwise,
  Briefcase,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { KpiStrip } from '../components/glc/KpiStrip';
import { ActionPanel } from '../components/glc/ActionPanel';
import { ActivityFeed } from '../components/glc/ActivityFeed';
import { useDashboard } from '../hooks/useDashboard';
import { Callout } from '../components/ui/callout';
import { Button } from '../components/ui/button';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { APP_ROUTE_PATHS } from '../config/route-paths';
import { APP_SHELL_COPY } from '../config/app-shell-copy';

export function Dashboard() {
  const { data: dashData, loading: dashLoading, error: dashError, reloadDashboard } = useDashboard();
  const dashboardCopy = WORKSPACE_PAGE_COPY.dashboard;
  const consultantNavCopy = APP_SHELL_COPY.nav.consultant;

  return (
    <AppShell
      title={dashboardCopy.appShellTitle}
      subtitle={dashboardCopy.appShellSubtitle}
      actions={
        <Button asChild variant="default" className="hidden sm:inline-flex">
          <Link to="/audit/new">
            <Plus className="w-4 h-4" /> {dashboardCopy.newAuditButton}
          </Link>
        </Button>
      }
    >
      <div className="glc-page-content space-y-8 mobile:space-y-6">

        {/* ── 1. KPI strip ──────────────────────────────────────── */}
        <div className="glc-page-hero glc-orb-decor p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="glc-kicker">{dashboardCopy.heroKicker}</p>
              <h2 className="glc-hero-title mt-2">{dashboardCopy.heroTitle}</h2>
              <p className="glc-hero-sub">
                {dashboardCopy.heroSubtitle}
              </p>
            </div>
            <div className="sm:hidden">
              <Button asChild variant="default" className="w-full justify-center no-underline">
                <Link to="/audit/new">
                  <Plus className="w-4 h-4" /> {dashboardCopy.newAuditButton}
                </Link>
              </Button>
            </div>
          </div>
          <KpiStrip kpis={dashData?.kpis} loading={dashLoading} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="ds-touch-target sm:min-h-0">
              <Link to={APP_ROUTE_PATHS.adminRequests}>
                <Tray className="h-4 w-4" />
                {consultantNavCopy.requestQueue}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="ds-touch-target sm:min-h-0">
              <Link to={APP_ROUTE_PATHS.adminSnapshots}>
                <Lightning className="h-4 w-4" />
                {consultantNavCopy.snapshotQueue}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="ds-touch-target sm:min-h-0">
              <Link to={APP_ROUTE_PATHS.adminDiscovery}>
                <MagnifyingGlass className="h-4 w-4" />
                {consultantNavCopy.discoveryQueue}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="ds-touch-target sm:min-h-0">
              <Link to={APP_ROUTE_PATHS.adminAudits}>
                <Briefcase className="h-4 w-4" />
                {consultantNavCopy.allAudits}
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Analytics error banner (non-fatal) ────────────────── */}
        {dashError && !dashLoading && (
          <Callout intent="danger" className="text-destructive flex items-center gap-2 rounded-md px-4 py-2.5 text-xs">
            <ArrowsClockwise className="w-3.5 h-3.5 flex-shrink-0" />
            {dashboardCopy.analyticsUnavailable}
          </Callout>
        )}

        {/* ── 2. Action Required ─────────────────────────────────── */}
        <ActionPanel
          items={dashData?.action_items}
          loading={dashLoading}
          onRefresh={reloadDashboard}
        />

        {/* ── 3. Activity Feed ──────────────────────────────────── */}
        <ActivityFeed
          events={dashData?.activity_feed}
          loading={dashLoading}
        />
      </div>
    </AppShell>
  );
}
